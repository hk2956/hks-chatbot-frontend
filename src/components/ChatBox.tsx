import { useState, useRef, useEffect } from 'react';

// 1. Message 타입에 thinking 속성 추가
interface Message {
  sender: 'user' | 'bot';
  text: string;
  thinking?: string;
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: '안녕하세요! 저는 한경국립대학교 AI 챗봇 한경서입니다. \n무엇을 도와드릴까요?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = { sender: 'user', text: inputText };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    // 봇 메시지 자리 확보
    setMessages((prev) => [...prev, { sender: 'bot', text: '', thinking: '' }]);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) throw new Error("로그인이 필요합니다.");

      const response = await fetch('http://minjun0410.iptime.org:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("토큰이 만료되었습니다. 다시 로그인해주세요.");
        throw new Error(`서버 에러: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let isThinking = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('data: ')) {
              let textPart = trimmedLine.slice(6);
              textPart = textPart.replace(/\\n/g, '\n');

              if (textPart.includes('[THINK]')) {
                isThinking = true;
                textPart = textPart.replace('[THINK]', '');
              }

              const isCurrentlyThinking = isThinking;

              if (textPart.includes('[/THINK]')) {
                isThinking = false;
                textPart = textPart.replace('[/THINK]', '');
              }

              if (textPart.startsWith('[TOOL]')) {
                console.log("🛠️ 툴 사용 중:", textPart);
                continue;
              }
              if (textPart.startsWith('[ALERT]')) {
                textPart = textPart.replace('[ALERT]', '🚨 ').replace('[/ALERT]', '');
              }

              if (textPart) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;

                  if (isCurrentlyThinking) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      thinking: (newMessages[lastIndex].thinking || '') + textPart
                    };
                  } else {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      text: (newMessages[lastIndex].text || '') + textPart
                    };
                  }
                  return newMessages;
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("통신 실패:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          text: error.message || '서버 연결에 실패했습니다.'
        };
        return newMessages;
      });
    } finally {
      // ✅ 여기서만 로딩 종료
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', right: '20px', top: '120px', bottom: '20px', width: '600px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', zIndex: 10, overflow: 'hidden'
    }}>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {messages.map((msg, index) => {
          if (msg.text === '' && msg.thinking === '') return null;

          return (
            <div key={index} style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>

              {/* ⭐️ AI의 생각 과정(thinking)을 원본 그대로 보여주는 박스 */}
              {msg.sender === 'bot' && msg.thinking && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  color: '#555',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  borderLeft: '4px solid #aeb6bf',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',

                  // ✅ 추가: 너무 길면 박스 내부 스크롤
                  maxHeight: '180px',          // 원하는 높이로 조절 (예: 120~240px)
                  overflowY: 'auto',
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#888',
                    fontFamily: 'sans-serif',
                    position: 'sticky',        // ✅ 스크롤해도 제목 고정
                    top: 0,
                    background: 'rgba(0,0,0,0.05)',
                    paddingBottom: '6px'
                  }}>
                    💭 한경서의 생각 과정
                  </div>
                  {msg.thinking}
                </div>
              )}

              {/* 진짜 대화 내용 (기존 말풍선) */}
              {msg.text && (
                <div style={{
                  backgroundColor: msg.sender === 'user' ? '#00285a' : '#e9f2ff',
                  color: msg.sender === 'user' ? 'white' : '#333',
                  padding: '12px 18px', borderRadius: '15px', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  borderBottomRightRadius: msg.sender === 'user' ? '0px' : '15px',
                  borderTopLeftRadius: msg.sender === 'bot' ? '0px' : '15px',
                }}>
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: '#666', padding: '5px 15px', fontSize: '14px', fontStyle: 'italic' }}>
            💭 한경서가 답변을 생각하는 중입니다...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', padding: '15px', borderTop: '1px solid #eee', backgroundColor: 'white' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="질문을 입력해주세요..."
          disabled={isLoading}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          style={{
            padding: '10px 20px', backgroundColor: isLoading ? '#ccc' : '#00285a',
            color: 'white', border: 'none', borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold'
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}