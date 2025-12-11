<template>
  <teleport to="body">
    <div class="share-overlay" @click="emit('close')">
      <div class="share-dialog" @click.stop>
        <!-- 头部 -->
        <div class="share-header">
          <h3 class="share-title">
            {{ shareMode === "message" ? "分享消息" : "分享对话" }}
          </h3>
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

        <!-- 内容区 -->
        <div class="share-body">
          <!-- 分享链接输入框 -->
          <div class="link-section">
            <div class="link-input-wrap">
              <input
                type="text"
                class="link-input"
                :value="shareUrl"
                readonly
                @click="$event.target.select()"
              />
              <button
                class="copy-btn"
                @click="copyLink"
                :class="{ copied: justCopied }"
              >
                <svg
                  v-if="!justCopied"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path>
                </svg>
                <svg
                  v-else
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ justCopied ? "已复制" : "复制" }}</span>
              </button>
            </div>
          </div>

          <!-- 分享到社交平台 -->
          <div class="social-section">
            <div class="section-label">分享到</div>
            <div class="social-buttons">
              <button class="social-btn" @click="shareToX" title="分享到 X">
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
              </button>
              <button
                class="social-btn"
                @click="shareToLinkedIn"
                title="分享到 LinkedIn"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
              </button>
              <button
                class="social-btn"
                @click="shareToReddit"
                title="分享到 Reddit"
              >
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
              </button>
              <button
                class="social-btn"
                @click="shareToWeChat"
                title="分享到微信"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["close"]);
const props = defineProps({
  title: { type: String, default: "分享" },
  shareUrl: { type: String, required: true },
  shareMode: { type: String, default: "session" }, // 'session' | 'message'
});

const justCopied = ref(false);

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

const shareToWeChat = () => {
  // 微信分享需要特殊处理，这里用二维码方式
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    props.shareUrl
  )}`;
  window.open(qrUrl, "_blank");
};
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: min(420px, 90vw);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.share-title {
  font-size: 16px;
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

.share-body {
  padding: 20px;
}

.link-section {
  margin-bottom: 20px;
}

.link-input-wrap {
  display: flex;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 4px;
}

.link-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  min-width: 0;
}

.link-input::selection {
  background: var(--accent-color);
  color: white;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--accent-color);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.copy-btn:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.copy-btn.copied {
  background: #10b981;
}

.social-section {
  margin-top: 4px;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.social-buttons {
  display: flex;
  gap: 12px;
}

.social-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.social-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-heavy);
  transform: translateY(-2px);
}

.social-btn:active {
  transform: translateY(0);
}

/* X (Twitter) */
.social-btn:nth-child(1):hover {
  background: #000;
  color: white;
  border-color: #000;
}

/* LinkedIn */
.social-btn:nth-child(2):hover {
  background: #0077b5;
  color: white;
  border-color: #0077b5;
}

/* Reddit */
.social-btn:nth-child(3):hover {
  background: #ff4500;
  color: white;
  border-color: #ff4500;
}

/* WeChat */
.social-btn:nth-child(4):hover {
  background: #07c160;
  color: white;
  border-color: #07c160;
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
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 移动端适配 */
@media (max-width: 480px) {
  .share-dialog {
    width: calc(100vw - 32px);
    margin: 16px;
  }

  .share-body {
    padding: 16px;
  }

  .link-input-wrap {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .copy-btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
  }

  .social-buttons {
    justify-content: center;
  }
}
</style>
