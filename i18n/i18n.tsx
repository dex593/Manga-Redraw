
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

// The JSON files were failing to load at runtime, causing a crash.
// By embedding the translations directly, we bypass the file loading problem entirely.
const en = {
  "header": {
    "title": "Manga Text Remover AI",
    "guide": "User Guide",
    "guideTooltip": "Open the user guide",
    "languageTooltip": "Change language"
  },
  "footer": {
    "poweredBy": "Powered by Google Gemini API. Created for demonstration purposes.",
    "discord": "Động Mòe Discord"
  },
  "common": {
    "startOver": "Start Over",
    "processImage": "Process Image",
    "processAnother": "Process Another Image",
    "downloadImage": "Download .PNG",
    "downloadPsd": "Download .PSD",
    "generating": "Generating...",
    "editResult": "Edit This Result",
    "redraw": "Redraw",
    "cancel": "Cancel",
    "close": "Close",
    "selectArea": "Area",
    "selectText": "Text",
    "mask": "Mask",
    "clearSelections": "Clear All Layers",
    "yes": "Yes",
    "no": "No",
    "processAll": "Process All Visible",
    "pan": "Pan",
    "go": "GO",
    "exitFocus": "Exit Focus",
    "confirm": "Confirm",
    "mobileSelectArea": "Area",
    "mobileSelectText": "Text",
    "mobileLayers": "Layers",
    "actions": "Actions"
  },
  "uploader": {
    "title": "Drag & Drop your manga panel here",
    "or": "or",
    "browse": "Browse Files",
    "supports": "Supports PNG, JPG, WEBP",
    "videoGuide": {
      "title": "Video Tutorial",
      "description": "Click to watch the full guide on YouTube.",
      "alt": "Video tutorial thumbnail"
    },
    "howItWorks": {
      "title": "How it works:",
      "step1": "Upload a manga image with text.",
      "step2": "Define 1024x1024 processing areas (blue boxes) that cover the text.",
      "step3": "Use the selection tool to draw boundaries (red lines) around the text you want to remove.",
      "step4": "Our AI will remove the text only within your selections.",
      "step5": "Download your clean, text-free manga panel."
    }
  },
  "imageDisplay": {
    "readyToProcess": "Ready to Process",
    "processedTitle": "Processing Complete",
    "reviewTitle": "Review & Adjust Sections",
    "reviewDescription": "If a section isn't perfect, you can provide a new prompt and click \"Redraw\" to have the AI try again.",
    "redrawPromptPlaceholder": "Custom prompt for this redraw (optional)",
    "lastAttemptFailed": "Last attempt failed.",
    "editingModeLabel": "Editing Mode",
    "defineAreaFirstTooltip": "You must define a processing area first.",
    "selectTextTooltip": "Select text to remove (red)",
    "maskTooltip": "Draw a white mask to cover content",
    "customPromptLabel": "Custom Prompt (Optional)",
    "customPromptPlaceholder": "Leave empty to use the default prompt.",
    "processDisabledTooltip": "You must have at least one unlocked area with at least one unlocked text selection.",
    "doNotClose": "Please do not close this window.",
    "confirmTileCreation": "Create a processing area here?",
    "status": {
      "processing": "Processing section {{current}} of {{total}}...",
      "paused": "Paused. {{count}} section(s) failed. Redraw to continue.",
      "assembling": "Assembling final image..."
    },
    "layers": {
      "title": "Layers",
      "resultLayerName": "Processed Result",
      "resultForText": "Result for {{index}}",
      "textSelectionName": "Text Selection {{index}}",
      "maskLayerName": "Mask Area {{index}}",
      "areaSelectionName": "Processing Area {{index}}",
      "deleteLayerTooltip": "Delete Layer",
      "processAreaTooltip": "Process this Area",
      "lockLayer": "Lock Layer (exclude from processing)",
      "unlockLayer": "Unlock Layer (include in processing)",
      "showLayer": "Show Layer on canvas",
      "hideLayer": "Hide Layer from canvas"
    }
  },
  "errors": {
    "title": "An Error Occurred",
    "errorPrefix": "Error",
    "noTextSelected": "At least one text selection area is required.",
    "noAreaSelected": "At least one 1024x1024 processing area is required.",
    "failedToPrepare": "Failed to prepare image for processing.",
    "unknown": "An unknown error occurred.",
    "stitching": "An error occurred while stitching the final image.",
    "loadProcessed": "Could not load processed image for further editing.",
    "selectionOutsideArea": "Error: One or more text selections are outside of any defined 1024x1024 processing area. Please clear selections and redraw them inside the blue areas."
  },
  "guide": {
    "title": "User Guide",
    "intro": {
      "title": "Welcome to Manga Text Remover AI!",
      "p1": "This guide will walk you through all features, from basic removal to advanced refinement. The key to this tool is the Layers Panel, which gives you full control."
    },
    "video": {
      "title": "🎬 Video Tutorial",
      "p1": "For a visual walkthrough, watch this complete guide on how to use the tool from start to finish.",
      "alt": "Video tutorial thumbnail"
    },
    "upload": {
      "title": "1. Upload Your Image",
      "p1": "Start by dragging and dropping an image file (PNG, JPG, WEBP) or using the 'Browse Files' button."
    },
    "coreConcept": {
      "title": "2. The Core Concept: Layers",
      "area": {
        "title": "Processing Area (Blue Box):",
        "p1": "This is your 'canvas'. It's a 1024x1024 square that you tell the AI to look at. Anything outside these boxes will be ignored."
      },
      "text": {
        "title": "Text Selection (Red Outline):",
        "p1": "This is your 'instruction'. Inside a blue area, you draw red outlines around text to tell the AI, 'Remove what's in here'."
      },
      "mask": {
        "title": "Mask Layer (White Shape):",
        "p1": "This is a 'cover-up'. You draw a solid white shape to completely erase something before the AI even sees the text outlines. Useful for complex backgrounds."
      }
    },
    "basicWorkflow": {
      "title": "3. Basic Workflow: Your First Pass",
      "step1": "Select 'Area' mode and click on the image to place blue boxes over all the text.",
      "step2": "Select 'Text' or 'Mask' mode and draw your selections inside the blue boxes.",
      "step3": "Click 'Process Image'. The tool will process all visible and unlocked areas for the first time."
    },
    "layers": {
      "title": "4. The Control Center: The Layers Panel",
      "p1": "This is your command center. Every area and selection you make appears here.",
      "visibility": {
        "title": "👁️ Visibility:",
        "p1": "Controls what you see, what gets processed, and what's in your final download. If a 'Result' layer is hidden, it won't be in the downloaded image."
      },
      "lock": {
        "title": "🔒 Lock:",
        "p1": "Protects a layer from being included in any 'Process' or 'Redraw' action. Lock finished areas to prevent accidental changes and save time."
      },
      "delete": {
        "title": "🗑️ Delete:",
        "p1": "Permanently removes a layer. Use this to delete bad selections or unwanted AI results."
      },
      "redraw": {
        "title": "🔄 Redraw (on Area Layer):",
        "p1": "This is the key to refinement! It tells the AI to re-process ONLY that specific area using its currently visible and unlocked sub-layers."
      }
    },
    "refinement": {
      "title": "5. The Refinement Loop: Perfecting Your Image",
      "p1": "What if one area isn't perfect? Don't start over! Follow these steps:",
      "step1": "Find the 'Processing Area' layer in the panel that needs fixing.",
      "step2": "Hide (click the 👁️) the generated 'Result' layer inside it to see the original again. If you don't like the result, delete it (🗑️). Draw new 'Text' or 'Mask' layers as needed.",
      "step3": "Click the 'Redraw' (🔄) button on the PARENT 'Processing Area' layer. The AI will try again on just that one box with your new instructions."
    },
    "batchProcessing": {
      "title": "6. Batch Processing: 'Process All Visible'",
      "p1": "After making changes to multiple areas, use the 'Process All Visible' button. It acts like a batch 'Redraw' for every area that is currently visible and unlocked, saving you from redrawing them one by one."
    },
    "finalize": {
      "title": "7. Finalizing Your Work",
      "download": {
        "title": "Download:",
        "p1": "Saves your final image. The download combines your original image with only the VISIBLE 'Result' layers."
      },
      "edit": {
        "title": "Edit This Result:",
        "p1": "A powerful pro tool. It 'flattens' your current result into a new base image, allowing you to start a fresh round of editing to fix tiny imperfections."
      }
    }
  },
  "webhook": {
    "imageUploaded": {
      "title": "Image Uploaded",
      "desc": "Filename: `{{filename}}`\nSize: {{size}} KB"
    },
    "processingStarted": {
      "title": "Processing Started",
      "desc": "**Tiles to process:** {{count}}\n**Custom prompt provided:** {{customPrompt}}"
    },
    "tileRedrawStarted": {
      "title": "Redrawing Tile...",
      "desc": "**Tile ID:** `{{tileId}}`\n**Custom prompt provided:** {{customPrompt}}"
    },
    "tileRedrawFinished": {
      "title": "Tile Redraw Complete",
      "desc": "**Tile ID:** `{{tileId}}`"
    },
    "processingFinished": {
      "title": "Processing Finished",
      "desc": "Stitching final image from **{{successCount}}** successful tile(s) out of {{totalCount}}."
    },
    "editResult": {
      "title": "Editing Final Result",
      "desc": "User loaded the processed image back into the editor for further refinement."
    },
    "imageDownloaded": {
      "title": "Image Downloaded",
      "desc": "User downloaded the result as a `{{format}}` file."
    }
  }
};

const vi = {
  "header": {
    "title": "AI Xóa Chữ Manga",
    "guide": "Hướng Dẫn",
    "guideTooltip": "Mở hướng dẫn sử dụng",
    "languageTooltip": "Thay đổi ngôn ngữ"
  },
  "footer": {
    "poweredBy": "Ứng dụng sử dụng Google Gemini API.",
    "discord": "Discord Động Mòe"
  },
  "common": {
    "startOver": "Làm Lại",
    "processImage": "Xử Lý Ảnh",
    "processAnother": "Xử Lý Ảnh Khác",
    "downloadImage": "Tải File .PNG",
    "downloadPsd": "Tải File .PSD",
    "generating": "Đang tạo file...",
    "editResult": "Sửa Kết Quả Này",
    "redraw": "Vẽ Lại",
    "cancel": "Hủy",
    "close": "Đóng",
    "selectArea": "Chọn Vùng",
    "selectText": "Khoanh Chữ",
    "mask": "Tạo Vùng Che",
    "clearSelections": "Xóa tất cả layer",
    "yes": "Có",
    "no": "Không",
    "processAll": "Xử lý toàn bộ",
    "pan": "Di chuyển",
    "go": "Xử lý",
    "exitFocus": "Thoát vùng {{name}}",
    "confirm": "Xác nhận",
    "mobileSelectArea": "Chọn vùng",
    "mobileSelectText": "Khoanh chữ",
    "mobileLayers": "Layers",
    "actions": "Hành động"
  },
  "uploader": {
    "title": "Kéo & Thả ảnh manga của bạn vào đây",
    "or": "hoặc",
    "browse": "Chọn Tệp",
    "supports": "Hỗ trợ PNG, JPG, WEBP",
    "videoGuide": {
      "title": "Video Hướng Dẫn",
      "description": "Nhấp để xem hướng dẫn đầy đủ trên YouTube.",
      "alt": "Ảnh bìa video hướng dẫn"
    },
    "howItWorks": {
      "title": "Cách hoạt động:",
      "step1": "Tải lên một hình ảnh manga có chữ.",
      "step2": "Xác định các vùng xử lý 1024x1024px (hộp màu xanh).",
      "step3": "Sử dụng công cụ lựa chọn để vẽ ranh giới (đường màu đỏ) xung quanh văn bản bạn muốn xóa.",
      "step4": "AI của chúng tôi sẽ chỉ xóa văn bản trong vùng bạn chọn.",
      "step5": "Tải xuống trang manga đã được làm sạch, không còn chữ."
    }
  },
  "imageDisplay": {
    "readyToProcess": "Sẵn Sàng Xử Lý",
    "processedTitle": "Đã Xử Lý Xong",
    "reviewTitle": "Xem Lại & Căn Chỉnh",
    "reviewDescription": "Nếu một vùng nào đó chưa hoàn hảo, bạn có thể cung cấp một prompt mới và nhấp vào \"Xử lý Vùng Này\" để AI thử lại.",
    "redrawPromptPlaceholder": "Prompt tùy chỉnh để xử lý lại (tùy chọn)",
    "lastAttemptFailed": "Lần thử cuối thất bại.",
    "editingModeLabel": "Chế Độ Chỉnh Sửa",
    "defineAreaFirstTooltip": "Bạn phải xác định một vùng xử lý trước.",
    "selectTextTooltip": "Khoanh vùng chữ muốn xóa (đỏ)",
    "maskTooltip": "Vẽ một lớp che màu trắng để ẩn nội dung",
    "customPromptLabel": "Prompt Tùy Chỉnh (Tùy chọn)",
    "customPromptPlaceholder": "Để trống để sử dụng prompt mặc định.",
    "processDisabledTooltip": "Bạn phải có ít nhất một vùng xử lý và một vùng chữ không bị khóa.",
    "doNotClose": "Vui lòng không đóng cửa sổ này.",
    "confirmTileCreation": "Bạn muốn tạo vùng xử lý tại vị trí này?",
    "status": {
      "processing": "Đang xử lý vùng {{current}}/{{total}}...",
      "paused": "Tạm dừng. {{count}} vùng bị lỗi. Xử lý lại để tiếp tục.",
      "assembling": "Đang ghép ảnh cuối cùng..."
    },
    "layers": {
      "title": "Layers",
      "resultLayerName": "Kết Quả Xử Lý",
      "resultForText": "Kết quả cho {{index}}",
      "textSelectionName": "Vùng Chữ {{index}}",
      "maskLayerName": "Vùng Che {{index}}",
      "areaSelectionName": "Vùng Xử Lý {{index}}",
      "deleteLayerTooltip": "Xóa Layer",
      "processAreaTooltip": "Xử lý vùng này",
      "lockLayer": "Khóa Layer (bỏ qua khi xử lý)",
      "unlockLayer": "Mở khóa Layer (đưa vào xử lý)",
      "showLayer": "Hiện Layer",
      "hideLayer": "Ẩn Layer"
    }
  },
  "errors": {
    "title": "Đã Xảy Ra Lỗi",
    "errorPrefix": "Lỗi",
    "noTextSelected": "Cần có ít nhất một vùng chữ được khoanh.",
    "noAreaSelected": "Cần có ít nhất một vùng xử lý 1024x1024.",
    "failedToPrepare": "Không thể chuẩn bị ảnh để xử lý.",
    "unknown": "Đã xảy ra một lỗi không xác định.",
    "stitching": "Đã xảy ra lỗi khi ghép ảnh cuối cùng.",
    "loadProcessed": "Không thể tải ảnh đã xử lý để chỉnh sửa thêm.",
    "selectionOutsideArea": "Lỗi: Một hoặc nhiều vùng chữ nằm ngoài bất kỳ vùng xử lý 1024x1024 nào. Vui lòng xóa và khoanh lại vùng chữ bên trong các ô màu xanh."
  },
  "guide": {
    "title": "Hướng Dẫn Sử Dụng",
    "intro": {
      "title": "Chào mừng bạn đến với AI Xóa Chữ Manga!",
      "p1": "Hướng dẫn này sẽ chỉ cho bạn tất cả các tính năng, từ xóa chữ cơ bản đến kỹ thuật tinh chỉnh nâng cao. Chìa khóa của công cụ này là Bảng Layers, nơi cho bạn toàn quyền kiểm soát."
    },
    "video": {
      "title": "🎬 Video Hướng Dẫn",
      "p1": "Để xem hướng dẫn trực quan, hãy xem video đầy đủ này về cách sử dụng công cụ từ đầu đến cuối.",
      "alt": "Ảnh bìa video hướng dẫn"
    },
    "upload": {
      "title": "1. Tải Ảnh Lên",
      "p1": "Bắt đầu bằng cách kéo và thả một tệp ảnh (PNG, JPG, WEBP) hoặc sử dụng nút 'Chọn Tệp'."
    },
    "coreConcept": {
      "title": "2. Khái Niệm Cốt Lõi: Các Loại Layer",
      "area": {
        "title": "Vùng Xử Lý (Ô màu xanh):",
        "p1": "Đây là những vùng sẽ được gửi lên AI xử lý. Nó là một ô vuông 1024x1024px. Mọi thứ bên ngoài các ô này sẽ bị bỏ qua."
      },
      "text": {
        "title": "Vùng Chữ (Viền màu đỏ):",
        "p1": "Đây là vùng văn bản mà bạn cần khoanh để chỉ dẫn cho AI biết nên xóa chỗ nào. Vùng này phải ở bên trong Vùng Xử Lý."
      },
      "mask": {
        "title": "Vùng Che (Hình màu trắng):",
        "p1": "Đây là một lớp 'che phủ' có tác dụng che các vùng không muốn AI nhìn thấy."
      }
    },
    "basicWorkflow": {
      "title": "3. Quy Trình Cơ Bản: Lần Xử Lý Đầu Tiên",
      "step1": "Chọn chế độ 'Chọn Vùng' và nhấp vào ảnh của bạn để đặt các ô màu xanh kích thước 1024x1024px.",
      "step2": "Chọn chế độ 'Khoanh Chữ' để khoanh các vùng văn bản cần xóa và 'Tạo Vùng Che' để che các vùng không muốn AI thấy, các vùng khoanh này phải nằm trong 'Vùng Xử Lý' màu xanh lam.",
      "step3": "Nhấp vào 'Xử Lý Ảnh'. Công cụ sẽ xử lý tất cả các vùng 'không bị khóa'."
    },
    "layers": {
      "title": "4. Trung Tâm Chỉ Huy: Bảng Layers",
      "p1": "Đây là trung tâm chỉ huy của bạn. Mọi vùng và lựa chọn bạn thực hiện đều xuất hiện ở đây.",
      "visibility": {
        "title": "👁️ Ẩn/Hiện:",
        "p1": "Kiểm soát những gì bạn thấy."
      },
      "lock": {
        "title": "🔒 Khóa:",
        "p1": "Khóa layer có tác dụng để layer khỏi bị đưa vào bất kỳ hành động 'Xử lý' nào. Hãy khóa các vùng chữ khoanh đỏ đã hoàn thành ưng ý để tránh thay đổi."
      },
      "delete": {
        "title": "🗑️ Xóa:",
        "p1": "Loại bỏ vĩnh viễn một layer. Sử dụng chức năng này để xóa các lựa chọn sai hoặc kết quả AI không mong muốn."
      },
      "redraw": {
        "title": "🔄 Xử lý vùng (đặt cạnh Layer Vùng Xử Lý):",
        "p1": "Đây là chìa khóa để tinh chỉnh! Nó yêu cầu AI xử lý lại CHỈ khu vực vùng xử lý đó (AI sẽ không xử lý các layer đang khóa ở trong vùng)."
      }
    },
    "refinement": {
      "title": "5. Vòng Lặp Tinh Chỉnh: Hoàn Thiện Bức Ảnh Của Bạn",
      "p1": "Nếu một khu vực nào đó chưa hoàn hảo thì sao? Đừng bắt đầu lại! Hãy làm theo các bước sau:",
      "step1": "Tìm layer 'Vùng Xử Lý' cần sửa trong bảng điều khiển.",
      "step2": "Tinh chỉnh các layer theo ý muốn ví dụ như Ẩn hiện, khóa và mở khóa, xóa layer, vẽ lại các vùng chữ vừa vùng che.",
      "step3": "Nhấp vào 'Xử lý vùng' (🔄) trên layer 'Vùng Xử Lý'. AI sẽ thử lại với hướng dẫn mới của bạn."
    },
    "batchProcessing": {
      "title": "6. Xử Lý Hàng Loạt: 'Xử lý toàn bộ'",
      "p1": "Sau khi thay đổi nhiều vùng, hãy dùng nút 'Xử lý toàn bộ'. Nó hoạt động như lệnh 'Xử lý vùng' cho mọi vùng đang hiển thị và không bị khóa, giúp bạn tiết kiệm thời gian."
    },
    "finalize": {
      "title": "7. Hoàn Tất Công Việc",
      "download": {
        "title": "Tải Xuống:",
        "p1": "Lưu ảnh cuối cùng. Ảnh tải xuống sẽ gộp ảnh gốc với các layer 'Kết Quả' ĐANG HIỂN THỊ."
      },
      "edit": {
        "title": "Sửa Kết Quả Này:",
        "p1": "Công cụ chuyên nghiệp. Nó 'gộp' kết quả hiện tại thành ảnh gốc mới, cho phép bạn bắt đầu vòng chỉnh sửa mới để sửa các lỗi nhỏ."
      }
    }
  },
  "webhook": {
    "imageUploaded": {
      "title": "Ảnh Đã Được Tải Lên",
      "desc": "Tên file: `{{filename}}`\nDung lượng: {{size}} KB"
    },
    "processingStarted": {
      "title": "Bắt Đầu Xử Lý",
      "desc": "**Số vùng xử lý:** {{count}}\n**Sử dụng prompt tùy chỉnh:** {{customPrompt}}"
    },
    "tileRedrawStarted": {
      "title": "Đang Xử Lý Lại Vùng...",
      "desc": "**ID Vùng:** `{{tileId}}`\n**Sử dụng prompt tùy chỉnh:** {{customPrompt}}"
    },
    "tileRedrawFinished": {
      "title": "Hoàn Tất Xử Lý Vùng",
      "desc": "**ID Vùng:** `{{tileId}}`"
    },
    "processingFinished": {
      "title": "Xử Lý Hoàn Tất",
      "desc": "Đang ghép ảnh cuối cùng từ **{{successCount}}** vùng thành công trên tổng số {{totalCount}} vùng."
    },
    "editResult": {
      "title": "Chỉnh Sửa Kết Quả",
      "desc": "Người dùng đã tải ảnh đã xử lý vào trình chỉnh sửa để tinh chỉnh thêm."
    },
    "imageDownloaded": {
      "title": "Đã Tải Xuống Ảnh",
      "desc": "Người dùng đã tải xuống kết quả dưới dạng file `{{format}}`."
    }
  }
};


type Language = 'en' | 'vi';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Try to get language from localStorage, default to 'vi'
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('app-language');
        return (saved === 'en' || saved === 'vi') ? saved : 'vi';
    });

    const handleSetLanguage = useCallback((lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('app-language', lang);
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let current: any = language === 'en' ? en : vi;

        for (const k of keys) {
            if (current[k] === undefined) {
                console.warn(`Missing translation for key: ${key} in language: ${language}`);
                return key;
            }
            current = current[k];
        }

        if (typeof current !== 'string') {
             console.warn(`Translation key does not point to a string: ${key} in language: ${language}`);
             return key;
        }

        let translated = current;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                translated = translated.replace(`{{${k}}}`, String(v));
            });
        }

        return translated;
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage: handleSetLanguage,
        t
    }), [language, handleSetLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
