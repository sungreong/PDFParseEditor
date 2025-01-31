import React, { useState, useEffect, useCallback } from 'react';
import type { Box } from '@/hooks/useLayerManager';
import ReactMarkdown from 'react-markdown';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { API_ENDPOINTS } from '../config/api';
import DraggablePopup, { DraggablePopupProps } from '@/components/common/DraggablePopup';

interface BoxDetailEditorProps {
  box: Box;
  originalBox?: Box | null;
  onUpdate: (boxId: string, updates: Partial<Box>) => void;
  onCancel?: () => void;
  onDelete?: (boxId: string) => void;
  pageNumber: number;
  documentName: string;
  viewerWidth: number;
  viewerHeight: number;
  layers: { id: string; name: string; color: string }[];
  isOpen: boolean;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-800">{title}</span>
        <span className="text-gray-500 transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const BoxDetailEditor: React.FC<BoxDetailEditorProps> = ({
  box,
  originalBox,
  onUpdate,
  onCancel,
  onDelete,
  pageNumber,
  documentName,
  viewerWidth,
  viewerHeight,
  layers,
  isOpen,
  position,
  onPositionChange
}) => {
  const [editedData, setEditedData] = useState({
    color: box.color || '',
    text: box.text || '',
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height
  });
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [boxImage, setBoxImage] = useState<string | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'text' | 'position'>('info');

  // 임시 모델 목록 (나중에 API로 받아올 수 있음)
  const availableModels = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5', name: 'GPT-3.5' },
    { id: 'claude-3', name: 'Claude 3' },
  ];

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (isNaN(value)) return;
    const newValue = parseFloat(value.toString());
    const updates = { [axis]: newValue };
    setEditedData(prev => ({ ...prev, ...updates }));
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    if (isNaN(value)) return;
    const newValue = parseFloat(value.toString());
    const updates = { [dimension]: newValue };
    setEditedData(prev => ({ ...prev, ...updates }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setEditedData(prev => ({ ...prev, color: newColor }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditedData(prev => ({ ...prev, text: newText }));
  };

  const handleSave = () => {
    // 모든 필드를 포함하여 최종 업데이트
    const updates: Partial<Box> = {
      color: editedData.color,
      text: editedData.text,
      x: editedData.x,
      y: editedData.y,
      width: editedData.width,
      height: editedData.height
    };

    // 실제 박스 업데이트
    onUpdate(box.id, updates);

    // 저장 성공 팝업 표시
    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded shadow-lg z-[9999] flex items-center gap-2';
    popup.innerHTML = `
      <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span class="font-medium">변경사항이 저장되었습니다</span>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
      popup.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => {
        document.body.removeChild(popup);
      }, 300);
    }, 1500);

    // 상세 정보 창 닫기
    if (onCancel) {
      onCancel();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      // 원래 상태로 복원
      const originalUpdates: Partial<Box> = {
        color: box.color,
        text: box.text,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      };
      onUpdate(box.id, originalUpdates);
      onCancel();
    }
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleRunAI = async () => {
    if (!selectedModel || !prompt) return;
    
    setIsProcessing(true);
    try {
      // TODO: 실제 AI API 호출 로직 구현
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
      
      // 임시 응답 (나중에 실제 API 응답으로 대체)
      const aiResponse = "AI가 처리한 텍스트 결과입니다.";
      
      setEditedData(prev => ({ ...prev, text: aiResponse }));
    } catch (error) {
      console.error('AI 처리 중 오류:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: 'info', label: '메타 정보' },
    { id: 'text', label: '텍스트' },
    { id: 'position', label: '위치/크기' },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">ID:</span> {box.id}
              </div>
              <div className="text-sm">
                <span className="text-gray-500">타입:</span> {box.type}
              </div>
              <div className="text-sm">
                <span className="text-gray-500">페이지:</span> {pageNumber}
              </div>
              <div className="text-sm flex items-center gap-2">
                <span className="text-gray-500">레이어:</span>
                <select
                  value={box.layerId || ''}
                  onChange={(e) => onUpdate(box.id, { layerId: e.target.value })}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                >
                  {layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
                <div
                  className="w-6 h-6 rounded-full border"
                  style={{
                    backgroundColor: layers.find(l => l.id === box.layerId)?.color || '#000000'
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">색상:</span>
                <input
                  type="color"
                  value={editedData.color || '#000000'}
                  onChange={handleColorChange}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className="text-sm font-mono">{editedData.color || '#000000'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">생성일:</span>{' '}
                {box.metadata?.createdAt ? new Date(box.metadata.createdAt).toLocaleString() : '-'}
              </div>
              <div className="text-sm">
                <span className="text-gray-500">수정일:</span>{' '}
                {box.metadata?.updatedAt ? new Date(box.metadata.updatedAt).toLocaleString() : '-'}
              </div>
            </div>
            {/* 변경 사항 비교 섹션 */}
            {originalBox && (
              <div className="mt-4 space-y-4">
                <h3 className="text-sm font-medium">변경 사항</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">이전</h4>
                    <div className="space-y-1 text-sm">
                      <p>위치: ({Math.round(originalBox.x)}, {Math.round(originalBox.y)})</p>
                      <p>크기: {Math.round(originalBox.width)} × {Math.round(originalBox.height)}</p>
                      <p>텍스트: {originalBox.text?.length || 0}자</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">이후</h4>
                    <div className="space-y-1 text-sm">
                      <p>위치: ({Math.round(box.x)}, {Math.round(box.y)})</p>
                      <p>크기: {Math.round(box.width)} × {Math.round(box.height)}</p>
                      <p>텍스트: {box.text?.length || 0}자</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'text':
        return (
          <div className="space-y-4">
            {/* PDF 영역 섹션 */}
            <CollapsibleSection title="PDF 영역" defaultOpen={true}>
              <div className="space-y-2">
                {boxImage ? (
                  <div className="border rounded p-2 bg-gray-50">
                    <div className="relative">
                      <img
                        src={boxImage}
                        alt="PDF 영역"
                        className="w-full h-auto"
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex justify-between items-center">
                          <span>페이지 {pageNumber}</span>
                          <span>좌표: ({Math.round(box.x)}, {Math.round(box.y)})</span>
                          <span>크기: {Math.round(box.width)} × {Math.round(box.height)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm p-4 text-center border rounded bg-gray-50">
                    이미지를 불러오는 중...
                  </div>
                )}
                <button
                  onClick={captureBoxArea}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  새로고침
                </button>
              </div>
            </CollapsibleSection>

            {/* 텍스트 편집 섹션 */}
            <CollapsibleSection title="텍스트 내용" defaultOpen={true}>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-base font-medium text-gray-700">텍스트 내용</label>
                    <button
                      onClick={() => setIsMarkdownPreview(!isMarkdownPreview)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isMarkdownPreview
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isMarkdownPreview ? '편집' : '미리보기'}
                    </button>
                  </div>
                  {isMarkdownPreview ? (
                    <div className="w-full min-h-[200px] max-h-[600px] p-4 border rounded overflow-y-auto bg-white">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{editedData.text || '*텍스트가 없습니다*'}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={editedData.text}
                      onChange={handleTextChange}
                      className="w-full min-h-[200px] p-4 border rounded text-base resize-y"
                      placeholder="텍스트를 입력하세요..."
                    />
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* 변경 사항 섹션 */}
            {originalBox && originalBox.text !== editedData.text && (
              <CollapsibleSection title="변경 사항" defaultOpen={true}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">이전</h4>
                      <div className="p-3 bg-red-50 rounded text-sm text-red-700 whitespace-pre-wrap">
                        {originalBox.text || '(텍스트 없음)'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">이후</h4>
                      <div className="p-3 bg-green-50 rounded text-sm text-green-700 whitespace-pre-wrap">
                        {editedData.text || '(텍스트 없음)'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <div>이전: {originalBox.text?.length || 0}자</div>
                    <div>이후: {editedData.text?.length || 0}자</div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* AI 도구 섹션 */}
            <CollapsibleSection title="AI 도구" defaultOpen={false}>
              <div className="space-y-3">
                <select
                  value={selectedModel}
                  onChange={handleModelSelect}
                  className="w-full p-2 border rounded"
                >
                  <option value="">AI 모델 선택</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="프롬프트를 입력하세요..."
                  className="w-full h-24 p-2 border rounded resize-none"
                />
                <button
                  onClick={handleRunAI}
                  disabled={!selectedModel || !prompt || isProcessing}
                  className="w-full py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                  {isProcessing ? '처리 중...' : 'AI 처리 실행'}
                </button>
              </div>
            </CollapsibleSection>
          </div>
        );
      case 'position':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">X 좌표</label>
              <input
                type="number"
                value={Math.round(editedData.x)}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Y 좌표</label>
              <input
                type="number"
                value={Math.round(editedData.y)}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">너비</label>
              <input
                type="number"
                value={Math.round(editedData.width)}
                onChange={(e) => handleSizeChange('width', parseFloat(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">높이</label>
              <input
                type="number"
                value={Math.round(editedData.height)}
                onChange={(e) => handleSizeChange('height', parseFloat(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        );
    }
  };

  const captureBoxArea = useCallback(async () => {
    if (!box || !documentName || !pageNumber) {
      console.warn('필수 정보가 누락되었습니다:', { box, documentName, pageNumber });
      return;
    }

    try {
      setIsCapturing(true);
      console.log('캡처 요청 데이터:', {
        id: box.id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        viewer_width: viewerWidth,
        viewer_height: viewerHeight,
      });

      const response = await fetch(API_ENDPOINTS.CAPTURE_BOX(documentName, pageNumber), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          box_id: box.id,
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          viewer_width: Math.round(viewerWidth),
          viewer_height: Math.round(viewerHeight),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류가 발생했습니다.' }));
        throw new Error(errorData.detail || '캡처 요청 실패');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('빈 이미지가 반환되었습니다.');
      }

      const imageUrl = URL.createObjectURL(blob);
      setBoxImage(imageUrl);
    } catch (error) {
      console.error('PDF 영역 캡처 실패:', error);
      setBoxImage(null);
    } finally {
      setIsCapturing(false);
    }
  }, [box?.id, box?.x, box?.y, box?.width, box?.height, pageNumber, documentName, viewerWidth, viewerHeight]);

  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      captureBoxArea();
    }, 1000);

    return () => {
      clearTimeout(timer);
      // 이전 이미지 URL 정리
      if (boxImage) {
        URL.revokeObjectURL(boxImage);
      }
    };
  }, [isOpen, captureBoxArea, boxImage]);

  const handleDelete = () => {
    if (window.confirm('이 박스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      onDelete?.(box.id);
      onCancel?.();
    }
  };

  return (
    <DraggablePopup
      isOpen={isOpen}
      onClose={() => onCancel?.()}
      title={`박스 상세 정보 - ${box.text?.substring(0, 30) || '텍스트 없음'}${box.text && box.text.length > 30 ? '...' : ''}`}
      width="600px"
      height="600px"
      zIndex={100}
      position={position}
      onPositionChange={onPositionChange}
      headerButtons={
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-red-100 rounded-full transition-colors text-red-600 hover:text-red-700 mr-2"
          title="박스 삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      }
    >
      <div className="flex h-full bg-gray-50">
        {/* PDF 영역 이미지 인덱스 */}
        <div className="relative">
          <div 
            className={`absolute left-0 transform -translate-x-full bg-white rounded-l-lg shadow-md transition-all duration-300 ${
              isImageExpanded ? 'w-[320px]' : 'w-[48px] cursor-pointer hover:bg-gray-50'
            }`}
            style={{
              top: '16px',
              height: isImageExpanded ? '360px' : '140px',
              borderWidth: '1px 0 1px 1px',
              borderColor: 'rgb(229 231 235)',
            }}
            onClick={() => !isImageExpanded && setIsImageExpanded(true)}
          >
            {isImageExpanded ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-3 border-b">
                  <span className="text-sm font-semibold text-gray-700">PDF 영역</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsImageExpanded(false);
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 p-3 overflow-hidden">
                  {boxImage ? (
                    <div className="relative h-full rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={boxImage}
                        alt="PDF 영역"
                        className="w-full h-full object-contain bg-gray-50"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
                        <div className="flex justify-between items-center">
                          <span>Page {pageNumber}</span>
                          <span>{Math.round(box.width)} × {Math.round(box.height)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>이미지를 불러오는 중...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-2 text-gray-600">
                <div className="w-full aspect-square mb-2 overflow-hidden rounded-lg border border-gray-200">
                  {boxImage ? (
                    <img
                      src={boxImage}
                      alt="PDF 영역 미리보기"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium whitespace-nowrap transform -rotate-90">PDF 영역</span>
              </div>
            )}
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex flex-col h-full bg-white">
          {/* 탭 헤더 */}
          <div className="flex border-b bg-white sticky top-0 z-10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {renderTabContent()}
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white sticky bottom-0 z-10">
            <button
              onClick={onCancel}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </DraggablePopup>
  );
};

export default BoxDetailEditor; 