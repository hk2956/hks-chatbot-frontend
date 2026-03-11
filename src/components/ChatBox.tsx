import { useState, useRef, useEffect, useMemo } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  thinking?: string;
  tools?: string[];
  imageUrl?: string; 
}

export default function ChatBox() {
  const IS_MOCK_MODE = true;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnswerStarted, setHasAnswerStarted] = useState(false);

  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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
          const cachedImagesStr = localStorage.getItem('chat_image_cache');
          const cachedImages = cachedImagesStr ? JSON.parse(cachedImagesStr) : {};

          if (history.length > 0) {
            const formattedHistory = history.map((msg: any) => {
              const msgText = msg.content.replace(/\\n/g, '\n');
              return {
                sender: msg.role === 'user' ? 'user' : 'bot',
                text: msgText,
                imageUrl: msg.role === 'user' ? cachedImages[msgText] : undefined
              };
            });
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
    const imageCache: Record<string, string> = {};
    messages.forEach(msg => {
      if (msg.sender === 'user' && msg.imageUrl && msg.text) {
        imageCache[msg.text] = msg.imageUrl; 
      }
    });

    if (Object.keys(imageCache).length > 0) {
      try {
        localStorage.setItem('chat_image_cache', JSON.stringify(imageCache));
      } catch (e) {
        console.warn("캐시 용량 초과: 이전 사진 중 일부가 저장되지 않을 수 있습니다.");
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, previewUrl]);

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

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다!');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedImageType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setSelectedImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true); 
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    
    if (dragCounter.current === 0) {
      setIsDragging(false); 
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeImage = () => {
    setPreviewUrl(null);
    setSelectedImageBase64(null);
    setSelectedImageType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = '48px'; 
    const scrollHeight = e.target.scrollHeight;
    e.target.style.height = `${Math.min(scrollHeight, 120)}px`;
    e.target.style.overflowY = scrollHeight > 120 ? 'auto' : 'hidden';
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' && !selectedImageBase64) return;

    setHasAnswerStarted(false);

    const permanentImageUrl = selectedImageBase64 ? `data:${selectedImageType};base64,${selectedImageBase64}` : undefined;

    const userMessage: Message = { 
      sender: 'user', 
      text: inputText, 
      imageUrl: permanentImageUrl 
    };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { sender: 'bot', text: '', thinking: '', tools: [] }]);

    // ⭐️ 가짜 모드 작동 부분!
    if (IS_MOCK_MODE) {
      setTimeout(() => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            text: "서버 없이 프론트엔드 단독 모드로 테스트 중입니다! 🤖\n\n1. UI 수정\n2. 드래그 앤 드롭 테스트\n마음껏 해보세요!",
            thinking: "이미지도 잘 올라오고, 드래그도 잘 되는다잉." 
          };
          return newMessages;
        });
        setIsLoading(false);
        setHasAnswerStarted(true);
      }, 1500); 
      
      if (inputRef.current) {
        inputRef.current.style.height = '48px';
        inputRef.current.style.overflowY = 'hidden';
      }
      removeImage();
      return; 
    }
    
    if (inputRef.current) {
      inputRef.current.style.height = '48px';
      inputRef.current.style.overflowY = 'hidden';
    }

    const imageToSend = selectedImageBase64;
    const imageTypeToSend = selectedImageType;
    removeImage();

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) throw new Error("로그인이 필요합니다.");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: currentInput,
          image: imageToSend || null,
          image_media_type: imageTypeToSend || null
        }),
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
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'absolute', right: '20px', top: '120px', bottom: '20px', width: '600px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', zIndex: 10, overflow: 'hidden'
      }}
    >
      <style>
        {`
          .dot-flashing { animation: dot-flashing 1s infinite alternate; }
          @keyframes dot-flashing { 0% { opacity: 0.3; } 100% { opacity: 1; } }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
        `}
      </style>

      {isDragging && (
        <div style={{
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(32, 33, 35, 0.85)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          color: 'white',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
            📋
          </div>
          
          <p style={{ 
            marginTop: '12px', 
            fontSize: '15px', 
            color: '#d1d5db',
            fontWeight: '500' 
          }}>
            대화에 추가하려면 여기에 파일을 드롭하세요
          </p>
        </div>
      )}

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, index) => {
          const isLastBot = msg.sender === 'bot' && index === lastBotIndex;
          const isEmptyBotBubble = msg.sender === 'bot' && msg.text === '' && (msg.thinking ?? '') === '' && (msg.tools?.length ?? 0) === 0;

          if (isEmptyBotBubble && !(isLoading && isLastBot)) return null;
          if (msg.sender === 'user' && !msg.text && !msg.imageUrl) return null;

          const hasThinkingBox = msg.sender === 'bot' && !!msg.thinking;
          const toolList = msg.sender === 'bot' ? (msg.tools ?? []) : [];

          return (
            <div
              key={index}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '6px'
              }}
            >
              {isLoading && isLastBot && !hasAnswerStarted && (
                <div style={{ alignSelf: 'flex-start', color: '#666', padding: '5px 15px', fontSize: '14px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤔 한경서가 생각 중</span><span className="dot-flashing">...</span>
                </div>
              )}

              {hasThinkingBox && (
                <>
                  <div style={{ color: '#888', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', paddingLeft: '6px' }}>💭 한경서의 생각 과정</div>
                  <div ref={isLastBot ? thinkingScrollRef : undefined} style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: '#555', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', borderLeft: '4px solid #aeb6bf', wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '50px', overflowY: 'auto' }}>
                    {msg.thinking}
                  </div>
                </>
              )}

              {toolList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '6px' }}>
                  {toolList.map((tool, i) => (
                    <div key={`${tool}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', backgroundColor: '#e9f2ff', color: '#1e3a8a', fontSize: '12px', border: '1px solid rgba(0, 40, 90, 0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <span style={{ fontWeight: 700 }}>🛠</span><span style={{ whiteSpace: 'nowrap' }}>{tool}</span>
                    </div>
                  ))}
                </div>
              )}

              {msg.imageUrl && (
                <img 
                  src={msg.imageUrl} 
                  alt="uploaded" 
                  onClick={() => setZoomedImageUrl(msg.imageUrl || null)} 
                  onLoad={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })} // 👈 핵심 추가 부분!!
                  style={{ 
                    maxWidth: '100%', maxHeight: '200px', borderRadius: '15px', 
                    objectFit: 'cover', alignSelf: 'flex-end',
                    cursor: 'zoom-in',
                    marginBottom: msg.text ? '4px' : '0'
                  }} 
                />
              )}

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
        <div ref={messagesEndRef} />
      </div>

      {previewUrl && (
        <div style={{ padding: '10px 15px', backgroundColor: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <img src={previewUrl} alt="preview" style={{ height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
            <button onClick={removeImage} style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
          </div>
          <span style={{ fontSize: '13px', color: '#666' }}>이미지 첨부됨</span>
        </div>
      )}

      {/* 하단 입력 영역 */}
      <div style={{ display: 'flex', padding: '15px', borderTop: '1px solid #eeeeee', backgroundColor: 'white', alignItems: 'center' }}>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} style={{ background: 'none', border: 'none', fontSize: '12px', cursor: isLoading ? 'not-allowed' : 'pointer', marginRight: '10px', opacity: isLoading ? 0.5 : 1 }} title="이미지 첨부">➕</button>

        <textarea
          ref={inputRef} 
          value={inputText} 
          onChange={handleTextChange} 
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return; 
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); 
              handleSendMessage();
            }
          }}
          placeholder="한경서에게 물어보기 ....." 
          disabled={isLoading}
          rows={1}
          style={{ 
            flex: 1, 
            padding: '12px 14px',
            borderRadius: '10px', 
            border: '1px solid #ccc', 
            marginRight: '10px',
            resize: 'none', 
            fontFamily: 'inherit',
            lineHeight: '1.5',
            
            boxSizing: 'border-box',
            height: '48px',
            minHeight: '48px',       
            overflowY: 'hidden',
            outline: 'none'
          }}
        />
        <button onClick={handleSendMessage} disabled={isLoading} style={{ padding: '10px 20px', backgroundColor: isLoading ? '#ccc' : '#00285a', color: 'white', border: 'none', borderRadius: '10px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>전송</button>
      </div>

      {/* 이미지 크게 보기 모달 */}
      {zoomedImageUrl && (
        <div 
          onClick={() => setZoomedImageUrl(null)} 
          style={{
            position: 'fixed', 
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, 
            cursor: 'zoom-out' 
          }}
        >
          <img 
            src={zoomedImageUrl} 
            alt="zoomed" 
            style={{ 
              maxWidth: '90%', maxHeight: '90%', 
              borderRadius: '10px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)' 
            }} 
          />
        </div>
      )}

    </div>
  );
}