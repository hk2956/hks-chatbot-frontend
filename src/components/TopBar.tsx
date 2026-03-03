// ⭐️ 1. App.tsx에서 넘겨주는 로그아웃 리모컨(onLogout)의 타입을 정의합니다.
interface TopBarProps {
  onLogout: () => void;
}

// ⭐️ 2. props로 { onLogout }을 받아옵니다.
export default function TopBar({ onLogout }: TopBarProps) {
  return (
    // 상단바 크기 조절
    <header style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100px',
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between', // ⭐️ 양 끝으로 요소를 밀어내는 마법의 속성 추가!
      padding: '0 20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      boxSizing: 'border-box',
      zIndex: 10
    }}>
      
      {/* ⭐️ 3. 로고와 텍스트가 떨어지지 않게 하나의 div로 묶어줍니다. */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/Resources/hknulogo.png"
          alt="한경대 로고"
          style={{
            height: '80px', // 상단바 높이(100px)에 맞춰 적당히 조절
            width: 'auto',   // 가로 세로 비율 유지
            marginRight: '15px' // 글씨와의 간격
          }}
        />
        
        <h2 style={{ margin: 0, color: '#00285a', fontFamily: 'inherit' }}>
          한경국립대학교 AI 챗봇
        </h2>
      </div>

      {/* ⭐️ 4. 우측 상단 로그아웃 버튼 추가 */}
      <button 
        onClick={onLogout} // 버튼을 누르면 로그아웃 실행!
        style={{
          padding: '10px 20px',
          backgroundColor: '#ff4d4f', // 경고/탈출 느낌의 예쁜 빨간색
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '15px',
          marginRight: '10px', // 오른쪽 여백 살짝 추가
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d9363e'} // 마우스 올리면 살짝 어두워짐
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff4d4f'}
      >
        로그아웃
      </button>
      
    </header>
  );
}