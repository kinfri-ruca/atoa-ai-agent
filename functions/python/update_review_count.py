# functions/python/update_review_count.py

import firebase_admin
from firebase_functions import firestore_fn
from firebase_admin import firestore, initialize_app
import logging

# Firebase Admin SDK를 초기화합니다.
firebase_app = initialize_app()
db = firestore.client()

@firestore_fn.on_document_created(document="raw_reviews/{reviewId}")
def on_review_created(event: firestore_fn.Event):
    """
    raw_reviews 컬렉션에 새 문서가 생성될 때 실행되는 함수입니다.
    해당 학원의 리뷰 수를 계산하여 academy_reputations 문서에 업데이트합니다.
    """
    try:
        new_review_data = event.data.get("value").get("fields")
        academy_name_field = new_review_data.get("academy_name")

        if not academy_name_field:
            logging.error("academy_name 필드가 없습니다. 업데이트를 건너뜁니다.")
            return

        academy_name = academy_name_field.get("stringValue")
        logging.info(f"새 리뷰가 추가되었습니다: {academy_name}")

        query = db.collection("raw_reviews").where("academy_name", "==", academy_name)
        docs = query.stream()
        
        total_reviews = sum(1 for _ in docs)
        logging.info(f"{academy_name}의 총 리뷰 수: {total_reviews}")

        academy_doc_ref = db.collection("academy_reputations").document(academy_name)
        
        if academy_doc_ref.get().exists:
            academy_doc_ref.update({"total_reviews": total_reviews})
            logging.info(f"성공적으로 total_reviews를 업데이트했습니다: {academy_name} -> {total_reviews}")
        else:
            logging.warning(f"academy_reputations에 {academy_name} 문서가 존재하지 않아 업데이트할 수 없습니다.")

    except Exception as e:
        logging.error(f"함수 실행 중 오류 발생: {e}", exc_info=True)