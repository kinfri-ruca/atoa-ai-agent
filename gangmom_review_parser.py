import sqlite3
import pandas as pd
import json

def load_reviews_from_db(db_path="gangmom_reviews.db"):
    """
    SQLite 데이터베이스에서 모든 리뷰 데이터를 불러와 Pandas DataFrame으로 반환합니다.
    """
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        
        # SQL 쿼리를 사용하여 모든 데이터 가져오기
        query = "SELECT * FROM reviews"
        df = pd.read_sql_query(query, conn)
        
        # 데이터베이스 연결 종료
        conn.close()
        
        print(f"✅ 총 {len(df)}개의 리뷰 데이터를 성공적으로 불러왔습니다.")
        
        return df

    except sqlite3.Error as e:
        print(f"❌ 데이터베이스 오류 발생: {e}")
        return None
    except Exception as e:
        print(f"❌ 데이터 로드 중 오류 발생: {e}")
        return None

# 실행 예시
if __name__ == "__main__":
    reviews_df = load_reviews_from_db()

    if reviews_df is not None:
        print("\n--- 데이터프레임 정보 ---")
        print(reviews_df.info())
        
        print("\n--- 데이터프레임 상위 5개 행 ---")
        print(reviews_df.head())
        
        # 다음 단계: 여기서부터 감성 점수, 신뢰도 점수 등을 계산하는 코드를 추가합니다.
        # 예를 들어: reviews_df['sentiment_score'] = reviews_df['review_text'].apply(lambda x: calculate_sentiment(x))