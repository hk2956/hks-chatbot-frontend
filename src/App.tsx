import { useState, useEffect } from 'react';
import Live2DViewer from './Live2DViewer';
import TopBar from './components/TopBar';
import ChatBox from './components/ChatBox';
import Login from './components/Login';

function App() {
  // 로그인 상태를 관리하는 State (토큰이 있는지 없는지)
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 화면이 처음 켜질 때 브라우저 금고(localStorage)에 토큰이 남아있는지 검사
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      setIsLoggedIn(true); // 토큰이 있으면 곧바로 곰돌이 화면으로 프리패스!
    }
  }, []);

  // 로그인 성공 시 실행될 함수 (Login 컴포넌트에서 호출됨)
  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('jwt_token', token); // 금고에 토큰 저장
    setIsLoggedIn(true); // 로그인 상태로 변경
  };

  // ⭐️ [추가됨] 로그아웃 함수: 금고에서 토큰을 찢어버리고 쫓아냅니다!
  const handleLogout = () => {
    localStorage.removeItem('jwt_token'); 
    setIsLoggedIn(false); 
  };

  // 만약 로그인이 안 되어 있다면 Login 화면만 보여줌!
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 로그인이 완료되었다면 곰돌이와 챗봇 화면을 보여줌!
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundImage: "url('/Resources/hknu.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden' 
    }}>
      
      {/* 1. 배경 위 곰돌이 (z-index: 1) */}
      <Live2DViewer />
      
      {/* 2. 상단바 UI (z-index: 10) */}
      {/* ⭐️ [수정됨] TopBar 컴포넌트에게 로그아웃 리모컨(함수)을 쥐어줍니다! */}
      <TopBar onLogout={handleLogout} />
      
      {/* 3. 우측 채팅창 UI (z-index: 10) */}
      <ChatBox />

    </div>
  );
}

export default App;