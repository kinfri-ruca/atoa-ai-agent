// public/dashboard.js

// Firebase Functions API URL
const API_BASE_URL = 'https://getreviews-nibpyqkfuq-uc.a.run.app';

// Function to fetch and display reviews
async function fetchReviews(academyName) {
    const reviewListContainer = document.getElementById('review-list');
    
    reviewListContainer.innerHTML = '<p>리뷰를 불러오는 중입니다...</p>';

    try {
        const url = `${API_BASE_URL}?academy_name=${encodeURIComponent(academyName)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            reviewListContainer.innerHTML = '<p>아직 등록된 리뷰가 없습니다.</p>';
            return;
        }

        reviewListContainer.innerHTML = '';
        
        reviews.forEach(review => {
            const reviewDiv = document.createElement('div');
            reviewDiv.classList.add('review-item');
            
            reviewDiv.innerHTML = `
                <p>${review.review_content}</p>
                <span>- ${review.writer_info}</span>
            `;
            reviewListContainer.appendChild(reviewDiv);
        });

    } catch (error) {
        console.error("Error fetching reviews:", error);
        reviewListContainer.innerHTML = `<p>리뷰를 불러오는 데 실패했습니다: ${error.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const academyName = urlParams.get('name');

    if (academyName) {
        document.getElementById('academy-name-title').textContent = academyName;
        fetchReviews(academyName);
    } else {
        document.getElementById('academy-name-title').textContent = '학원 정보를 찾을 수 없습니다.';
    }
});