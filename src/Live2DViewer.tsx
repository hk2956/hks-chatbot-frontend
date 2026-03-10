import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

(window as any).PIXI = PIXI;

export default function Live2DViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isDestroyed = false;
    let resizeHandler: () => void;

    const app = new PIXI.Application({
      view: canvasRef.current,
      backgroundAlpha: 0,
      resizeTo: window,

      resolution: window.devicePixelRatio || 1, 
      autoDensity: true,
    });

    const modelUrl = '/Resources/Bear Commander Belongs_to_DG_STUDIO/Bear Commander Belongs_to_DG_STUDIO.model3.json';

    Live2DModel.from(modelUrl).then((model) => {
      if (isDestroyed) {
        model.destroy();
        return;
      }

      modelRef.current = model;
      app.stage.addChild(model as any);

      resizeHandler = () => {
        if (app.renderer.resolution !== window.devicePixelRatio) {
          app.renderer.resolution = window.devicePixelRatio || 1;
          app.resize();
        }
        
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        model.scale.set(1); 
        
        // 모델 크기 조절
        const targetHeight = screenHeight * 1.5; 
        const scale = targetHeight / model.height; 
        model.scale.set(scale); // 계산된 완벽한 비율 적용!

        // 2. [가로 위치] 채팅창(약 450px)을 제외한 왼쪽 공간의 정중앙
        const chatBoxWidth = 450; 
        const leftSpace = screenWidth > chatBoxWidth ? screenWidth - chatBoxWidth : screenWidth;
        model.x = (leftSpace / 2) - (model.width / 2);

        // [세로 위치] 모델 화면 높이 수정
        const yOffset = screenHeight * 0.6; 
        model.y = screenHeight - model.height + yOffset;
      };

      resizeHandler();

      window.addEventListener('resize', resizeHandler);

      const view = app.view as HTMLCanvasElement;
      view.addEventListener('pointermove', (e: PointerEvent) => {
        model.focus(e.clientX, e.clientY);
      });

      setIsLoaded(true);

      console.log("✅ 한경서 로드 완료!");
    });

    // 컴포넌트가 꺼질 때 찌꺼기 청소 (매우 중요)
    return () => {
      isDestroyed = true;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler); // 리스너 끄기
      }
      app.destroy(false, true);
    };
  }, []);

  // ==========================================
  // 🕹️ 리모컨 조종
  // ==========================================
  /*
  const playMotionArms = () => modelRef.current?.motion('', 0);
  
  const resetMotion = () => {
    const internalModel = modelRef.current?.internalModel;
    if (!internalModel) return;

    internalModel.motionManager?.stopAllMotions();

    try {
      const coreModel = internalModel.coreModel as any;
      
      if (coreModel && coreModel._model && coreModel._model.parameters) {
        const params = coreModel._model.parameters;
        
        for (let i = 0; i < params.count; i++) {
          coreModel.setParameterValueByIndex(i, params.defaultValues[i]);
        }
      }
    } catch (error) {
      console.log("모션 초기화 중 에러 발생:", error);
    }
  };

  const expNormal = () => modelRef.current?.expression(0);    // 0: 기본
  const expAngry = () => modelRef.current?.expression(1);     // 1: 화난
  const expSad = () => modelRef.current?.expression(2);       // 2: 슬픈
  const expLove = () => modelRef.current?.expression(3);      // 3: 사랑
  const expSparkle = () => modelRef.current?.expression(4);   // 4: 반짝
  const expContempt = () => modelRef.current?.expression(5);  // 5: 경멸
  
  const resetExpression = () => modelRef.current?.internalModel.motionManager.expressionManager?.resetExpression();
  */
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
      />

      {/* isLoaded && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '15px',
          borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', gap: '8px',
          maxHeight: '80vh', overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#00285a' }}>한경서 리모컨</h4>
          
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>[ 애니메이션 ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={playMotionArms} style={{ ...btnStyle, color: "#000000" }}>💪 팔짱 끼기</button>
            <button onClick={resetMotion} style={{ ...btnStyle, backgroundColor: '#ffeafd', color: '#d00' }}>
              🛑 모션 초기화
            </button>
          </div>
          
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginTop: '10px' }}>[ 표정 변화 ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={expNormal} style={{ ...btnStyle, color: "#000000" }}>🙂 기본</button>
            <button onClick={expAngry} style={{ ...btnStyle, color: "#000000" }}>😡 화난</button>
            <button onClick={expSad} style={{ ...btnStyle, color: "#000000" }}>😢 슬픈</button>
            <button onClick={expLove} style={{ ...btnStyle, color: "#000000" }}>😍 사랑</button>
            <button onClick={expSparkle} style={{ ...btnStyle, color: "#000000" }}>✨ 반짝</button>
            <button onClick={expContempt} style={{ ...btnStyle, color: "#000000" }}>😒 경멸</button>
          </div>
          <button onClick={resetExpression} style={{ ...btnStyle, backgroundColor: '#ffeaea', color: '#d00', marginTop: '5px' }}>
            🔄 표정 초기화
          </button>
        </div>
      )*/}
    </>
  );
}

// 리모컨 버튼 디자인
/* const btnStyle = {
  padding: '8px 12px',
  cursor: 'pointer',
  borderRadius: '5px',
  border: '1px solid #ccc',
  backgroundColor: '#f9f9f9',
  fontFamily: 'inherit',
  fontSize: '13px'
}; */