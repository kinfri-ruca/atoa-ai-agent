// ai-script.js

// 🚩 AI 추천 결과를 표시하는 함수 (데이터는 임시로 가정)
function displayRecommendation(recommendationData) {
    const academyList = document.querySelector('.academy-list');
    const planContent = document.querySelector('.plan-content');
    
    // 추천 학원 목록 표시
    recommendationData.academies.forEach(academy => {
        const card = document.createElement('div');
        card.classList.add('academy-card');
        card.innerHTML = `
            <h3>${academy.name}</h3>
            <p><strong>강점:</strong> ${academy.strengths}</p>
            <p class="rating">⭐️ 평판 점수: ${academy.score}</p>
        `;
        academyList.appendChild(card);
    });

    // 맞춤 학습 플랜 표시
    const planList = document.createElement('ul');
    recommendationData.plan.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        planList.appendChild(li);
    });
    planContent.appendChild(planList);
}

// 🚩 임시 데이터로 페이지를 구성
const placeholderData = {
    user: "김철수",
    academies: [
        {
            name: "탑코딩학원",
            strengths: "개인별 맞춤 진도, 꼼꼼한 코드 리뷰",
            score: 9.5
        },
        {
            name: "수리논술전문학원",
            strengths: "최상위권 학생 대상 심화 학습",
            score: 9.2
        }
    ],
    plan: [
        "주 3회 탑코딩학원 알고리즘 수업 수강",
        "토요일 오전에는 수리논술전문학원에서 심화 문제 풀이",
        "개인 프로젝트를 통해 포트폴리오 강화하기"
    ]
};

// 🚩 페이지 로드 시 임시 데이터로 UI 구성
document.addEventListener('DOMContentLoaded', () => {
    displayRecommendation(placeholderData);
});