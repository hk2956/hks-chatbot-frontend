import { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  // ⭐️ 탭 전환을 위한 상태 (true: 로그인 화면, false: 회원가입 화면)
  const [isLoginMode, setIsLoginMode] = useState(true);

  // ⭐️ 입력 폼 상태들
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('student'); // 기본값: 학생

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ⭐️ 탭을 바꿀 때마다 메시지와 비밀번호 칸을 비워줍니다.
  const toggleMode = (mode: boolean) => {
    setIsLoginMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // ==========================
        // 1. [로그인] 모드일 때 처리
        // ==========================
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, password }),
        });

        if (!response.ok) throw new Error('학번(사번) 또는 비밀번호를 확인해주세요.');

        const data = await response.json();
        if (data.access_token) {
          onLoginSuccess(data.access_token);
        } else {
          throw new Error('토큰 발급에 실패했습니다.');
        }

      } else {
        // ==========================
        // 2. [회원가입] 모드일 때 처리
        // ==========================
        const response = await fetch('http://minjun0410.iptime.org:8000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 백엔드 스키마에 맞춰 데이터 전송
          body: JSON.stringify({ 
            user_id: userId, 
            password, 
            name, 
            department, 
            role 
          }),
        });

        if (!response.ok) throw new Error('회원가입 실패 (이미 존재하는 학번/사번일 수 있습니다.)');

        // 회원가입 성공 시!
        setSuccessMsg('🎉 회원가입이 완료되었습니다! 로그인해주세요.');
        toggleMode(true); // 다시 로그인 탭으로 휙 넘겨줍니다.
      }
    } catch (error: any) {
      console.error('요청 에러:', error);
      setErrorMsg(error.message || '서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      width: '100vw', height: '100vh',
      backgroundImage: "url('/Resources/hknu.png')", // 배경화면 유지
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '30px 40px', borderRadius: '15px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        width: '400px', display: 'flex', flexDirection: 'column'
      }}>
        <h2 style={{ color: '#333', textAlign: 'center', marginBottom: '20px' }}>
          한경 AI 클라이언트
        </h2>

        {/* ⭐️ 상단 탭 (로그인 / 회원가입) */}
        <div style={{ display: 'flex', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>
          <button 
            type="button"
            onClick={() => toggleMode(true)}
            style={isLoginMode ? activeTabStyle : inactiveTabStyle}
          >
            로그인
          </button>
          <button 
            type="button"
            onClick={() => toggleMode(false)}
            style={!isLoginMode ? activeTabStyle : inactiveTabStyle}
          >
            회원가입
          </button>
        </div>

        {/* 성공 메시지 표시 영역 */}
        {successMsg && <div style={{ color: '#28a745', fontSize: '14px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* 공통 필드: 학번/사번 */}
          <div>
            <label style={labelStyle}>학번 / 사번</label>
            <input type="text" placeholder="학번 또는 사번 입력" value={userId} onChange={(e) => setUserId(e.target.value)} required style={inputStyle} />
          </div>

          {/* ⭐️ 회원가입일 때만 보이는 필드들 */}
          {!isLoginMode && (
            <>
              <div>
                <label style={labelStyle}>이름</label>
                <input type="text" placeholder="이름 입력" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>학과 / 부서</label>
                <input type="text" placeholder="예: 컴퓨터공학과" value={department} onChange={(e) => setDepartment(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>구분</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                  <option value="student">학생</option>
                  <option value="staff">교직원/관리자</option>
                </select>
              </div>
            </>
          )}

          {/* 공통 필드: 비밀번호 */}
          <div>
            <label style={labelStyle}>비밀번호</label>
            <input type="password" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          
          {/* 에러 메시지 표시 영역 */}
          {errorMsg && <div style={{ color: 'red', fontSize: '14px', marginTop: '-5px' }}>{errorMsg}</div>}
          
          {/* 제출 버튼 */}
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              padding: '14px', 
              backgroundColor: isLoading ? '#ccc' : '#007bff', // 예시 이미지와 비슷한 파란색
              color: 'white', border: 'none', borderRadius: '8px', 
              fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '10px', transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? '처리 중...' : (isLoginMode ? '로그인' : '회원가입')}
          </button>
        </form>
      </div>
    </div>
  );
}

// === 예쁜 UI를 위한 스타일 모음 ===
const activeTabStyle: React.CSSProperties = {
  flex: 1, padding: '12px', border: 'none', backgroundColor: '#007bff', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'
};
const inactiveTabStyle: React.CSSProperties = {
  flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', color: '#666', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '5px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
};