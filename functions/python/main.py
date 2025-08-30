import pandas as pd
from firebase_functions import https_fn
from firebase_admin import firestore, initialize_app
import json

# Add this line to explicitly initialize the Firebase Admin SDK
firebase_app = initialize_app()

@https_fn.on_request(timeout_sec=30)
def cors_handler(req: https_fn.Request) -> https_fn.Response:
    # OPTIONS 메서드일 경우, CORS 헤더만 반환
    if req.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return https_fn.Response('', status=204, headers=headers)

# getReputation 함수
@https_fn.on_request(timeout_sec=30)
def getReputation(req: https_fn.Request) -> https_fn.Response:
    # CORS 헤더 추가
    headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*' # 모든 오리진 허용
    }
    try:
        db = firestore.client()

        
        # Firestore에서 reputation_score_100을 기준으로 내림차순 정렬
        docs = db.collection('academy_reputations').order_by('reputation_score_100', direction=firestore.Query.DESCENDING).stream()
        academies_data = [doc.to_dict() for doc in docs]
       
        if not academies_data:
            return https_fn.Response(json.dumps({"error": "No data found"}), status=404)
        
           
        return https_fn.Response(json.dumps(academies_data, ensure_ascii=False).encode('utf-8'),
                                 headers={'Content-Type': 'application/json; charset=utf-8'})

    except Exception as e:
        print(f"❌ Unhandled error: {e}")
        return https_fn.Response(json.dumps({"error": str(e), "message": "An unexpected error occurred"}), status=500)

    
@https_fn.on_request(timeout_sec=30)
def getReviews(req: https_fn.Request) -> https_fn.Response:
    """
    특정 학원의 상세 리뷰 데이터를 Firestore에서 가져와 JSON으로 반환합니다.
    최신 리뷰를 먼저 반환하도록 정렬을 추가합니다.
    """
    # CORS 헤더 추가
    headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*' # 모든 오리진 허용
    }

    try:
        db = firestore.client()
        
        # 쿼리 파라미터에서 학원 이름 가져오기
        academy_name_raw = req.args.get('academy_name')
        
        if not academy_name_raw:
            return https_fn.Response(json.dumps({"error": "Academy name not provided"}), status=400)
            
        # 데이터베이스에 저장된 값과 정확히 일치하도록 문자열을 정제
        academy_name = academy_name_raw.strip()
        
        # Firestore 쿼리 (디버깅용 로그 추가)
        print(f"🔎 Searching for reviews with academy_name: '{academy_name}'")

        # Firestore 쿼리에 정렬(order_by) 추가
        docs = db.collection('raw_reviews').where('academy_name', '==', academy_name).stream()
        
        reviews_data = [doc.to_dict() for doc in docs]
        
        if not reviews_data:
            return https_fn.Response(json.dumps({"error": "No reviews found for this academy"}), status=404)
        
        
        return https_fn.Response(json.dumps(reviews_data, ensure_ascii=False).encode('utf-8'),
                                 headers={'Content-Type': 'application/json; charset=utf-8'})

    except Exception as e:
        print(f"❌ Error occurred: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500)