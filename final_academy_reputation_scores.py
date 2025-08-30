import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import re

def load_reviews_from_db(db_path="gangmom_reviews.db"):
    """
    Connects to the SQLite database and loads all reviews into a Pandas DataFrame.
    """
    try:
        conn = sqlite3.connect(db_path)
        query = "SELECT * FROM reviews"
        reviews_df = pd.read_sql_query(query, conn)
        conn.close()
        print(f"✅ Successfully loaded {len(reviews_df)} reviews from the database.")
        return reviews_df
    except sqlite3.Error as e:
        print(f"❌ Database error occurred: {e}")
        return None
    except Exception as e:
        print(f"❌ Data load error: {e}")
        return None

# Function to convert relative date strings to a standard format
def convert_relative_dates(date_str):
    if not isinstance(date_str, str):
        return pd.NaT
    date_str = date_str.strip()
    if "년 전" in date_str:
        years_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(days=years_ago * 365)
    elif "개월 전" in date_str:
        months_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(days=months_ago * 30)
    elif "일 전" in date_str:
        days_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(days=days_ago)
    elif "시간 전" in date_str:
        hours_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(hours=hours_ago)
    elif "분 전" in date_str:
        minutes_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(minutes=minutes_ago)
    elif "초 전" in date_str:
        seconds_ago = int(re.search(r'\d+', date_str).group())
        return datetime.now() - timedelta(seconds=seconds_ago)
    else:
        try:
            return pd.to_datetime(date_str)
        except:
            return pd.NaT

reviews_df = load_reviews_from_db()

if reviews_df is not None:
    # --- Feature Engineering ---
    # 1. Content Trust Score (more granular)
    generic_keywords = ['최고의 학원', '강추', '좋아요', '만족합니다', '매우 만족', '별로예요', '비추천']
    def calculate_content_trust(text):
        if not isinstance(text, str) or len(text) < 10:
            return 0.1
        if len(text) < 50 and any(kw in text for kw in generic_keywords):
            return 0.2
        if len(text) > 100:
            return 0.9
        return 0.5
    reviews_df['content_trust_score'] = reviews_df['text'].apply(calculate_content_trust)
    
    # 2. Author Trust Score
    reviews_df['is_repetitive'] = reviews_df.duplicated(subset=['text', 'source_file'], keep=False)
    reviews_df['author_trust_score'] = reviews_df['is_repetitive'].apply(lambda x: 0.1 if x else 1.0)
    
    # 3. Sentiment Score
    positive_keywords = ['좋아요', '만족', '좋은 점', '추천', '꼼꼼히', '친절', '감사', '도움']
    negative_keywords = ['아쉬운 점', '단점', '부족', '불편', '비추천', '불만', '힘들']
    def get_continuous_sentiment(text):
        if not isinstance(text, str):
            return 0.0
        positive_count = sum(text.count(kw) for kw in positive_keywords)
        negative_count = sum(text.count(kw) for kw in negative_keywords)
        if (positive_count + negative_count) == 0:
            return 0.0
        score = (positive_count - negative_count) / (positive_count + negative_count)
        return score
    reviews_df['sentiment_score_continuous'] = reviews_df['text'].apply(get_continuous_sentiment)
    
    # 4. Discrepancy Trust Score
    reviews_df['discrepancy_trust_score'] = reviews_df.apply(
        lambda row: 0.2 if row['rating'] >= 4.0 and row['sentiment_score_continuous'] < -0.5 else 1.0, axis=1
    )
    
    # 5. Combine all trust scores
    reviews_df['review_trust_score'] = reviews_df['content_trust_score'] * reviews_df['author_trust_score'] * reviews_df['discrepancy_trust_score']

    # --- Step 1: Group by Academy and Aggregate Features ---
    reviews_df['date_created'] = reviews_df['date_created'].apply(convert_relative_dates)
    reviews_df = reviews_df.dropna(subset=['date_created'])
    reviews_df['days_since_review'] = (datetime.now() - reviews_df['date_created']).dt.days

    academies_df = reviews_df.groupby('academy_name').agg(
        total_reviews=('review_id', 'count'),
        avg_rating=('rating', 'mean'),
        avg_review_trust_score=('review_trust_score', 'mean'),
        avg_sentiment_score=('sentiment_score_continuous', 'mean'),
        min_days_since_review=('days_since_review', 'min')
    ).reset_index()

    # --- Step 2: Calculate RAW Reputation Score ---
    w1_rating = 0.4
    w2_sentiment = 0.2
    w3_review_count = 0.2
    w4_freshness = 0.1
    w5_trust_score = 0.1
    
    max_reviews = academies_df['total_reviews'].max()
    academies_df['normalized_review_count'] = academies_df['total_reviews'] / max_reviews
    
    max_days = academies_df['min_days_since_review'].max()
    academies_df['normalized_freshness'] = 1 - (academies_df['min_days_since_review'] / max_days)
    
    # Calculate the raw score based on the formula
    academies_df['raw_reputation_score'] = (
        w1_rating * academies_df['avg_rating'] +
        w2_sentiment * (academies_df['avg_sentiment_score'] + 1) / 2 +
        w3_review_count * academies_df['normalized_review_count'] +
        w4_freshness * academies_df['normalized_freshness'] +
        w5_trust_score * academies_df['avg_review_trust_score']
    )
    
    # --- Step 3: Scale to 100-point system based on theoretical max ---
    # The maximum possible score is derived from the formula's weights and max values of each feature.
    theoretical_max_score = (w1_rating * 5.0) + (w2_sentiment * 1.0) + (w3_review_count * 1.0) + (w4_freshness * 1.0) + (w5_trust_score * 1.0)
    
    academies_df['reputation_score_100'] = (
        (academies_df['raw_reputation_score'] / theoretical_max_score)
    ) * 100
    
    # --- Step 4: Display and Save Results ---
    final_output = academies_df[['academy_name', 'raw_reputation_score', 'reputation_score_100']].sort_values(by='reputation_score_100', ascending=False)
    
    print("\n--- 최종 평판 점수 (상위 10개) ---")
    print(final_output.head(10))
    
    output_path = "final_academy_reputation_scores_comparison.csv"
    final_output.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"\n✅ 최종 결과가 '{output_path}' 파일로 저장되었습니다.")