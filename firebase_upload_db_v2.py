import pandas as pd
import sqlite3
import firebase_admin
from firebase_admin import credentials, firestore
import os

# 파일 경로 설정
db_file_path = "gangmom_reviews.db"
csv_file_path = "final_academy_reputation_scores_comparison.csv"

def load_reviews_from_db():
    """SQLite 데이터베이스에서 리뷰 데이터를 로드합니다."""
    try:
        conn = sqlite3.connect(db_file_path)
        reviews_df = pd.read_sql_query("SELECT * FROM reviews", conn)
        conn.close()
        print(f"✅ 리뷰 데이터 {len(reviews_df)}개 로드 완료.")
        return reviews_df
    except Exception as e:
        print(f"❌ 리뷰 데이터 로드 중 오류: {e}")
        return None

def load_reputation_scores():
    """CSV 파일에서 평판 점수 데이터를 로드합니다."""
    try:
        scores_df = pd.read_csv(csv_file_path)
        print(f"✅ 평판 점수 데이터 {len(scores_df)}개 로드 완료.")
        return scores_df
    except Exception as e:
        print(f"❌ 평판 점수 로드 중 오류: {e}")
        return None

def upload_to_firestore(collection_name, df, doc_id_column):
    """
    DataFrame의 데이터를 Firestore에 업로드합니다.
    """
    try:
        db = firestore.client()
        collection_ref = db.collection(collection_name)
        
        print(f"\n--- Firestore '{collection_name}' 컬렉션에 {len(df)}개 문서 업로드 시작 ---")
        
        for index, row in df.iterrows():
            doc_id = str(row[doc_id_column])
            data_to_upload = row.to_dict()
            collection_ref.document(doc_id).set(data_to_upload)
        
        print(f"✅ '{collection_name}' 컬렉션에 모든 데이터 업로드 성공!")
        return True
    except Exception as e:
        print(f"❌ Firestore 업로드 중 오류 발생: {e}")
        return False

def main():
    try:
        # Firebase CLI에 로그인된 계정 정보를 자동으로 사용하도록 초기화
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"❌ Firebase 인증 초기화 오류: {e}")
        print("💡 Firebase CLI에 로그인되어 있는지 확인하거나, 서비스 계정 키 파일이 올바른지 확인해주세요.")
        return
        
    # 1단계: 리뷰 데이터 업로드
    reviews_df = load_reviews_from_db()
    if reviews_df is not None:
        reviews_df['review_id'] = reviews_df['review_id'].astype(str)
        upload_to_firestore('raw_reviews', reviews_df, 'review_id')

    # 2단계: 평판 점수 데이터 업로드
    #scores_df = load_reputation_scores()
    #if scores_df is not None:
    #    upload_to_firestore('academy_reputations', scores_df, 'academy_name')

if __name__ == "__main__":
    main()