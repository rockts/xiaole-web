<template>
  <teleport to="body">
    <div class="share-overlay" @click="emit('close')">
      <div class="share-dialog" @click.stop>
        <!-- 头部：标题 + 关闭按钮 -->
        <div class="share-header">
          <h3 class="share-title">{{ title || "分享对话" }}</h3>
          <button class="close-btn" @click="emit('close')" aria-label="关闭">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 预览卡片 -->
        <div class="preview-section">
          <div class="preview-card">
            <!-- 对话内容预览 -->
            <div class="preview-content" v-if="previewMessages.length > 0">
              <div
                v-for="(msg, index) in previewMessages"
                :key="index"
                class="preview-message"
                :class="msg.role"
              >
                <div class="message-text">{{ msg.content }}</div>
              </div>
            </div>
            <div class="preview-content preview-loading" v-else>
              <div class="loading-text">加载预览中...</div>
            </div>
            <!-- 底部渐变 + 水印 -->
            <div class="preview-footer">
              <div class="preview-watermark">小乐 AI</div>
            </div>
          </div>
        </div>

        <!-- 分享操作按钮 -->
        <div class="share-actions">
          <button class="action-btn" @click="copyLink">
            <div class="action-icon">
              <svg
                v-if="!justCopied"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                ></path>
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                ></path>
              </svg>
              <svg
                v-else
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span class="action-label">{{
              justCopied ? "已复制" : "复制链接"
            }}</span>
          </button>

          <button class="action-btn" @click="shareToX" title="分享到 X">
            <div class="action-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                />
              </svg>
            </div>
            <span class="action-label">X</span>
          </button>

          <button
            class="action-btn"
            @click="shareToLinkedIn"
            title="分享到 LinkedIn"
          >
            <div class="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                />
              </svg>
            </div>
            <span class="action-label">LinkedIn</span>
          </button>

          <button
            class="action-btn"
            @click="shareToReddit"
            title="分享到 Reddit"
          >
            <div class="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
                />
              </svg>
            </div>
            <span class="action-label">Reddit</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/services/api";

const emit = defineEmits(["close"]);
const props = defineProps({
  title: { type: String, default: "分享对话" },
  shareUrl: { type: String, required: true },
  shareMode: { type: String, default: "session" },
  messages: { type: Array, default: () => [] }, // 可直接传入消息
});

const justCopied = ref(false);
const previewMessages = ref([]);

// 获取预览消息
onMounted(async () => {
  // 如果已传入 messages，直接使用
  if (props.messages && props.messages.length > 0) {
    previewMessages.value = props.messages.slice(-4).map((m) => ({
      role: m.role || m.author || "assistant",
      content: truncateText(m.content || "", 150),
    }));
    return;
  }

  // 否则从 URL 中提取 sessionId 并请求
  try {
    const id = props.shareUrl.split("/").filter(Boolean).pop()?.split("?")[0];
    if (id) {
      const data = await api.getSession(id);
      const list = data.messages || data.history || [];
      previewMessages.value = list.slice(-4).map((m) => ({
        role: m.role || m.author || "assistant",
        content: truncateText(m.content || "", 150),
      }));
    }
  } catch (err) {
    console.log("获取预览消息失败:", err);
    previewMessages.value = [{ role: "assistant", content: "对话内容预览..." }];
  }
});

const truncateText = (text, maxLen) => {
  if (!text) return "";
  const cleaned = text.replace(/\n+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + "...";
};

const copyLink = async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.shareUrl);
    } else {
      const ta = document.createElement("textarea");
      ta.value = props.shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    justCopied.value = true;
    setTimeout(() => {
      justCopied.value = false;
    }, 2000);
  } catch (e) {
    console.error("复制失败", e);
    alert("复制失败，请重试");
  }
};

const open = (url) => window.open(url, "_blank", "noopener,noreferrer");

const shareToX = () => {
  const u = encodeURIComponent(props.shareUrl);
  const t = encodeURIComponent(props.title || "来自小乐 AI 的分享");
  open(`https://twitter.com/intent/tweet?url=${u}&text=${t}`);
};

const shareToLinkedIn = () => {
  const u = encodeURIComponent(props.shareUrl);
  open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`);
};

const shareToReddit = () => {
  const u = encodeURIComponent(props.shareUrl);
  const t = encodeURIComponent(props.title || "来自小乐 AI 的分享");
  open(`https://www.reddit.com/submit?url=${u}&title=${t}`);
};
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.15s ease-out;
  backdrop-filter: blur(4px);
}

.share-dialog {
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 16px 70px rgba(0, 0, 0, 0.4);
  width: min(520px, 92vw);
  max-height: 85vh;
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
  display: flex;
  flex-direction: column;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  flex-shrink: 0;
}

.share-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 预览卡片区域 */
.preview-section {
  padding: 0 24px 20px;
  flex-shrink: 0;
}

.preview-card {
  position: relative;
  background: #212121;
  border-radius: 12px;
  padding: 20px;
  min-height: 180px;
  max-height: 280px;
  overflow: hidden;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-content.preview-loading {
  align-items: center;
  justify-content: center;
  min-height: 140px;
}

.loading-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}

.preview-message {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

.preview-message.user {
  color: rgba(255, 255, 255, 0.7);
  padding-left: 12px;
  border-left: 2px solid rgba(255, 255, 255, 0.2);
}

.preview-message.assistant {
  color: rgba(255, 255, 255, 0.95);
}

.message-text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(to bottom, transparent, #212121 70%);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px 20px;
}

.preview-watermark {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
}

/* 分享操作按钮区域 */
.share-actions {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 20px 24px 24px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn:hover .action-icon {
  background: var(--bg-hover);
  border-color: var(--text-secondary);
}

.action-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 50%;
  color: var(--text-primary);
  transition: all 0.15s;
}

.action-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 复制成功状态 */
.action-btn:first-child .action-icon {
  background: var(--bg-secondary);
}

/* 悬停时的特殊颜色 */
.action-btn:nth-child(2):hover .action-icon {
  background: #000;
  color: white;
  border-color: #000;
}

.action-btn:nth-child(3):hover .action-icon {
  background: #0077b5;
  color: white;
  border-color: #0077b5;
}

.action-btn:nth-child(4):hover .action-icon {
  background: #ff4500;
  color: white;
  border-color: #ff4500;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 移动端适配 */
@media (max-width: 540px) {
  .share-dialog {
    width: calc(100vw - 24px);
    margin: 12px;
    max-height: calc(100vh - 48px);
  }

  .share-header {
    padding: 16px 20px;
  }

  .preview-section {
    padding: 0 16px 16px;
  }

  .preview-card {
    min-height: 140px;
    max-height: 200px;
    padding: 16px;
  }

  .share-actions {
    gap: 20px;
    padding: 16px 20px 20px;
  }

  .action-icon {
    width: 44px;
    height: 44px;
  }

  .action-label {
    font-size: 11px;
  }
}
</style>
