import React, { useEffect, useState } from 'react';

// ⭐️ 1. props 타입 정의
interface TopBarProps {
  onLogout: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  // ⭐️ 2. 사용자 정보를 담을 상태(State) 만들기
  const [userInfo, setUserInfo] = useState({
    name: '사용자',
    user_id: '',
    department: ''
  });

  // ⭐️ 3. 페이지가 로드될 때 토큰을 까서 정보 가져오기
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        // JWT 토큰은 헤더.페이로드.서명 3부분으로 나뉘어 있는데, 
        // 중간에 있는 '페이로드'에 사용자 정보가 들어있습니다.
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // 한글 깨짐 방지를 위한 디코딩 과정
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        
        // 해독한 정보를 상태에 저장
        setUserInfo({
          name: decoded.name || '사용자',
          user_id: decoded.user_id || '',
          department: decoded.department || '소속 없음'
        });
      } catch (error) {
        console.error("사용자 정보 해독 실패:", error);
      }
    }
  }, []);

  const handleClearChat = async () => {
    if (!window.confirm("대화 기록을 초기화할까요?")) {
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/session`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert("대화 기록이 초기화되었습니다.");
        window.location.reload();
      } else {
        throw new Error("초기화 실패");
      }
    } catch (error) {
      console.error("초기화 중 오류:", error);
      alert("서버 연결 실패로 초기화하지 못했습니다.");
    }
  };

  return (
    <header style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100px',
      backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      boxSizing: 'border-box', zIndex: 10
    }}>
      
      {/* ⬅️ 왼쪽 영역: 로고 및 타이틀 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/Resources/hknulogo.png" 
          alt="한경대 로고" 
          style={{ height: '70px', width: 'auto', marginRight: '15px' }} 
        />
        <h2 style={{ margin: 0, color: '#00285a', fontSize: '22px' }}>
          한경국립대학교 AI 챗봇
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'top', gap: '10px', textAlign: 'right', color: '#555', fontSize: '14px' }}>
          <img 
            src="/Resources/profile.png"
            alt="profile" 
            style={{ 
              width: '36px', 
              height: '36px',
            }} 
          />
          <div>
            <span style={{ display: 'block', fontWeight: 'bold', color: '#333' }}>
              {userInfo.name} {userInfo.user_id ? `(${userInfo.user_id})` : ''}
            </span>
            <span style={{ fontSize: '12px' }}>{userInfo.department}</span>
          </div>
        </div>

        {/* 버튼들 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleClearChat}
            style={grayButtonStyle}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            대화 초기화
          </button>
          
          <button 
            onClick={onLogout}
            style={redButtonStyle}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d9363e'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff4d4f'}
          >
            로그아웃
          </button>
        </div>
      </div>
      
    </header>
  );
}

// 🎨 스타일 정의
const grayButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'white',
  border: '1px solid #ddd',
  borderRadius: '8px',
  color: '#666',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const redButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#ff4d4f',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s'
};