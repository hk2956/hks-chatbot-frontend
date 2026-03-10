import { useState, useRef, useEffect, useMemo } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  thinking?: string;
  tools?: string[];
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [hasAnswerStarted, setHasAnswerStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);
  
  const inputRef = useRef<HTMLInputElement>(null); 

  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'bot') return i;
    }
    return -1;
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/history`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const history = await response.json();
          if (history.length > 0) {
            const formattedHistory = history.map((msg: any) => ({
              sender: msg.role === 'user' ? 'user' : 'bot',
              text: msg.content.replace(/\\n/g, '\n'),
            }));
            setMessages(formattedHistory);
          } else {
            setMessages([
              { sender: 'bot', text: '안녕하세요! 저는 한경국립대학교 AI 챗봇 한경서입니다. \n무엇을 도와드릴까요?' }
            ]);
          }
        }
      } catch (error) {
        console.error("히스토리 로드 실패:", error);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const el = thinkingScrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isLoading]);

  const formatToolLabel = (raw: string) => {
    let cleaned = raw.replace(/\[\/?TOOL\]/g, '').trim();
    cleaned = cleaned.replace(/\s*->\s*/g, '|');

    if (cleaned.includes('|')) {
      const [tool, ...rest] = cleaned.split('|');
      const desc = rest.join('|');
      return `${tool.trim()} | ${desc.trim()}`.trim();
    }
    return cleaned.replace(/\s+/g, ' ');
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    setHasAnswerStarted(false);

    const userMessage: Message = { sender: 'user', text: inputText };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { sender: 'bot', text: '', thinking: '', tools: [] }]);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) throw new Error("로그인이 필요합니다.");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
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

              if (textPart.includes('[TOOL]')) {
                const cleaned = textPart.replace(/\[\/?TOOL\]/g, '').trim(); 
                const toolLabel = formatToolLabel(cleaned);

                if (toolLabel) {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    const last = newMessages[lastIndex];

                    if (!last || last.sender !== 'bot') return prev;

                    const tools = last.tools ?? [];
                    if (tools.includes(toolLabel)) return prev;

                    newMessages[lastIndex] = { ...last, tools: [...tools, toolLabel] };
                    return newMessages;
                  });
                }
                continue;
              }

              if (textPart.startsWith('[ALERT]')) {
                textPart = textPart.replace('[ALERT]', '🚨 ').replace('[/ALERT]', '');
              }

              if (!isCurrentlyThinking && textPart) {
                setHasAnswerStarted(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', right: '20px', top: '120px', bottom: '20px', width: '600px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', zIndex: 10, overflow: 'hidden'
    }}>
      <style>
        {`
          .dot-flashing { animation: dot-flashing 1s infinite alternate; }
          @keyframes dot-flashing { 0% { opacity: 0.3; } 100% { opacity: 1; } }
        `}
      </style>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, index) => {
          const isLastBot = msg.sender === 'bot' && index === lastBotIndex;
          const isEmptyBotBubble = msg.sender === 'bot' && msg.text === '' && (msg.thinking ?? '') === '' && (msg.tools?.length ?? 0) === 0;

          if (isEmptyBotBubble && !(isLoading && isLastBot)) return null;
          if (msg.sender === 'user' && msg.text === '') return null;

          const hasThinkingBox = msg.sender === 'bot' && !!msg.thinking;
          const toolList = msg.sender === 'bot' ? (msg.tools ?? []) : [];

          return (
            <div
              key={index}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {isLoading && isLastBot && !hasAnswerStarted && (
                <div style={{
                  alignSelf: 'flex-start',
                  color: '#666',
                  padding: '5px 15px',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>🤔 한경서가 생각 중</span>
                  <span className="dot-flashing">...</span>
                </div>
              )}

              {hasThinkingBox && (
                <div style={{
                  color: '#888',
                  fontFamily: 'sans-serif',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  paddingLeft: '6px'
                }}>
                  💭 한경서의 생각 과정
                </div>
              )}

              {hasThinkingBox && (
                <div
                  ref={isLastBot ? thinkingScrollRef : undefined}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    color: '#555',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    borderLeft: '4px solid #aeb6bf',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    maxHeight: '50px',
                    overflowY: 'auto',
                  }}
                >
                  {msg.thinking}
                </div>
              )}

              {toolList.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  paddingLeft: '6px',
                }}>
                  {toolList.map((tool, i) => (
                    <div
                      key={`${tool}-${i}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#e9f2ff',
                        color: '#1e3a8a',
                        fontSize: '12px',
                        border: '1px solid rgba(0, 40, 90, 0.15)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>🛠</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{tool}</span>
                    </div>
                  ))}
                </div>
              )}

              {msg.text && (
                <div style={{
                  backgroundColor: msg.sender === 'user' ? '#00285a' : '#e9f2ff',
                  color: msg.sender === 'user' ? 'white' : '#333',
                  padding: '12px 18px',
                  borderRadius: '15px',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  borderBottomRightRadius: msg.sender === 'user' ? '0px' : '15px',
                  borderTopLeftRadius: msg.sender === 'bot' ? '0px' : '15px',
                }}>
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', padding: '15px', borderTop: '1px solid #eee', backgroundColor: 'white' }}>
        <input
          ref={inputRef}
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
            padding: '10px 20px',
            backgroundColor: isLoading ? '#ccc' : '#00285a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}