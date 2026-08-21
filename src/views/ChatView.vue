<template>
  <div
    class="chat-view"
    ref="chatViewRoot"
    :class="{ empty: isEmptyChat }"
    @dragover.prevent
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 全屏拖拽遮罩 -->
    <div v-if="isDraggingFile" class="drag-overlay">
      <div class="drag-content">
        <div class="drag-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <div class="drag-title">在此处拖放文件</div>
        <div class="drag-subtitle">添加任意内容到对话中</div>
      </div>
    </div>

    <!-- 会话加载错误提示 -->
    <div v-if="chatMode === 'core2'" class="core2-mode-notice">小乐 2.0 · 实验</div>
    <div v-if="sessionLoadError" class="session-error-message">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">无法加载会话</h2>
      <p class="error-detail">{{ sessionLoadError }}</p>
      <div class="error-actions">
        <button class="error-button" @click="handleRetryLoadSession">
          重试
        </button>
        <button class="error-button secondary" @click="handleGoToNewChat">
          新建对话
        </button>
      </div>
    </div>

    <!-- 空状态问候语 -->
    <div v-else-if="isEmptyChat" class="welcome-message">
      <div class="welcome-icon">👋</div>
      <h2 class="welcome-title">{{ currentGreeting }}</h2>
    </div>

    <div
      class="chat-container"
      ref="chatContainer"
      :class="{ 'is-loading': isLoadingSession }"
      @touchstart="handlePullRefreshStart"
      @touchmove="handlePullRefreshMove"
      @touchend="handlePullRefreshEnd"
    >
      <!-- 下拉刷新指示器 -->
      <div
        class="pull-refresh-indicator"
        :class="{
          visible: pullRefreshState !== 'idle',
          ready: pullRefreshState === 'ready',
          loading: pullRefreshState === 'loading',
        }"
        :style="{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }"
      >
        <div class="pull-refresh-content">
          <svg
            v-if="pullRefreshState !== 'loading'"
            class="pull-refresh-icon"
            :style="{
              transform: `rotate(${Math.min(pullDistance * 3, 180)}deg)`,
            }"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <div v-else class="pull-refresh-spinner"></div>
          <span class="pull-refresh-text">
            {{
              pullRefreshState === "loading"
                ? "加载中..."
                : pullRefreshState === "ready"
                ? "松开刷新"
                : "下拉刷新"
            }}
          </span>
        </div>
      </div>

      <div class="chat-inner">
        <div
          v-for="(message, idx) in messages"
          :key="message.id"
          class="message"
          :data-msg-id="message.id"
          :class="[
            message.role,
            {
              'new-group':
                idx === 0 || messages[idx - 1]?.role !== message.role,
              'thinking-message': message.status === 'thinking',
            },
          ]"
        >
          <template v-if="message.role === 'assistant'">
            <!-- AI消息的图片显示 -->
            <div v-if="message.image_path" class="message-image-wrapper">
              <img
                :key="`img-${message.id}-${formatImagePath(
                  message.image_path
                )}`"
                :src="formatImagePath(message.image_path)"
                alt="图片"
                class="message-image"
                loading="lazy"
                @click="openImage(formatImagePath(message.image_path))"
                @error="handleImageError($event)"
                @load="handleImageLoad($event)"
              />
              <div v-if="checkImageError(message)" class="image-error">
                <span>图片加载失败</span>
              </div>
            </div>
            <template v-if="message.status === 'thinking'">
              <div class="skeleton-wrapper">
                <!-- 骨架屏：模拟消息气泡占位 -->
                <div class="skeleton-content">
                  <div class="skeleton-line skeleton-line-long"></div>
                  <div class="skeleton-line skeleton-line-medium"></div>
                  <div class="skeleton-line skeleton-line-short"></div>
                </div>
                <!-- 思考动画指示器 -->
                <div class="thinking-indicator">
                  <div class="thinking-animation">
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                  </div>
                  <span class="thinking-label">小乐思考中</span>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- 语音会话结束标签渲染 -->
              <template v-if="message.messageType === 'voice-session-end'">
                <div class="voice-session-tag">
                  <div class="tag-left">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <line
                        x1="6"
                        y1="8"
                        x2="6"
                        y2="16"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                      <line
                        x1="10"
                        y1="6"
                        x2="10"
                        y2="18"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                      <line
                        x1="14"
                        y1="6"
                        x2="14"
                        y2="18"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                      <line
                        x1="18"
                        y1="8"
                        x2="18"
                        y2="16"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                    </svg>
                  </div>
                  <div class="tag-main">
                    <div class="tag-title">语音聊天已结束</div>
                    <div class="tag-sub">
                      {{ formatDuration(message.duration || 0) }}
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  class="md-content"
                  :class="{
                    typing: message.status === 'typing',
                    collapsed: isMessageCollapsed(message.id),
                  }"
                  v-html="renderMarkdown(getDisplayContent(message))"
                ></div>
                <Core2ResultMeta
                  v-if="message.core2"
                  :intent="message.intent"
                  :sources="message.sources"
                  :action="message.action"
                  :core2-error="message.core2Error"
                  @switch-legacy="switchToLegacy"
                />

                <div
                  v-if="message.status === 'typing'"
                  class="typing-indicator"
                  aria-live="polite"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <!-- Fallback for empty content when done -->
                <div
                  v-if="
                    message.status === 'done' &&
                    !getDisplayContent(message) &&
                    !message.image_path
                  "
                  style="
                    color: var(--text-tertiary);
                    font-style: italic;
                    font-size: 13px;
                  "
                >
                  (无内容)
                </div>

                <!-- 相关阅读卡片 -->
                <div v-if="hasRelatedReadings(message)" class="related-reading">
                  <div class="related-title">相关阅读</div>
                  <div class="related-cards">
                    <a
                      v-for="(item, i) in getRelatedReadings(message).slice(
                        0,
                        3
                      )"
                      :key="i"
                      :href="item.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="related-card"
                    >
                      <div class="card-image-area">
                        <img
                          :src="`https://www.google.com/s2/favicons?domain=${getDomain(
                            item.href
                          )}&sz=128`"
                          class="card-cover-icon"
                          @error="handleFaviconError"
                        />
                      </div>
                      <div class="card-content">
                        <div class="card-source">
                          <img
                            :src="`https://www.google.com/s2/favicons?domain=${getDomain(
                              item.href
                            )}&sz=32`"
                            class="favicon"
                            @error="handleFaviconError"
                          />
                          <span class="domain-text">{{
                            getDomain(item.href)
                          }}</span>
                        </div>
                        <div class="card-title" :title="item.title">
                          {{ item.title }}
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </template>
            </template>
          </template>
          <template v-else>
            <!-- 用户消息的图片显示 - 在气泡外面，上方位置 -->
            <div
              v-if="message.image_path"
              class="message-image-wrapper user-message-image"
            >
              <img
                :key="`img-${message.id}-${formatImagePath(
                  message.image_path
                )}`"
                :src="formatImagePath(message.image_path)"
                alt="图片"
                class="message-image"
                loading="lazy"
                @click="openImage(formatImagePath(message.image_path))"
                @error="handleImageError($event)"
                @load="handleImageLoad($event)"
              />
              <div v-if="checkImageError(message)" class="image-error">
                <span>图片加载失败</span>
              </div>
            </div>
            <div
              class="user-bubble"
              :class="{ 'voice-message': message.messageType === 'voice' }"
              v-if="editingMessageId !== message.id"
            >
              <div
                class="md-content"
                :class="{ collapsed: isMessageCollapsed(message.id) }"
                v-html="renderMarkdown(message.content)"
              ></div>

              <!-- 展开/折叠按钮 -->
              <button
                v-if="shouldShowExpandButton(message.content, 'user')"
                class="expand-btn"
                @click="toggleMessageExpand(message.id)"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  :style="{
                    transform: isMessageCollapsed(message.id)
                      ? 'rotate(0deg)'
                      : 'rotate(180deg)',
                  }"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <!-- 语音消息额外信息：麦克风图标 + 时长 -->
              <div v-if="message.messageType === 'voice'" class="voice-meta">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                  ></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                </svg>
                <span class="voice-duration">{{
                  formatDuration(message.duration || 0)
                }}</span>
              </div>
            </div>
            <!-- 编辑模式 -->
            <div v-else class="edit-mode-container">
              <textarea
                :id="`edit-textarea-${message.id}`"
                v-model="editingContent"
                class="edit-textarea"
                @input="autoResizeTextarea"
                @keydown.enter.exact.prevent
                @keydown.enter.ctrl="saveEdit(message)"
                @keydown.enter.meta="saveEdit(message)"
              ></textarea>
              <div class="edit-actions">
                <button class="btn-edit-action cancel" @click="cancelEdit">
                  取消
                </button>
                <button class="btn-edit-action save" @click="saveEdit(message)">
                  发送
                </button>
              </div>
            </div>
          </template>

          <div
            class="message-toolbar"
            v-if="
              (message.role === 'user' || message.status === 'done') &&
              editingMessageId !== message.id
            "
          >
            <button
              v-if="message.role === 'user' && message.messageType !== 'voice'"
              class="toolbar-icon"
              @click.stop="editMessage(message)"
              title="编辑"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                ></path>
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                ></path>
              </svg>
            </button>
            <button
              class="toolbar-icon"
              @click.stop="copyMessage(message)"
              :title="copiedMessageId === message.id ? '已复制' : '复制'"
            >
              <!-- 复制成功图标 (对号) -->
              <svg
                v-if="copiedMessageId === message.id"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-success"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <!-- 默认复制图标 -->
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                ></path>
              </svg>
            </button>
            <button
              v-if="
                message.role === 'assistant' &&
                feedbackState.get(message.id) !== 'down'
              "
              class="toolbar-icon"
              :class="{ active: feedbackState.get(message.id) === 'up' }"
              @click.stop="feedbackMessage(message, 'up')"
              title="有帮助"
            >
              <!-- 实心图标 (Active) -->
              <svg
                v-if="feedbackState.get(message.id) === 'up'"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                ></path>
              </svg>
              <!-- 空心图标 (Inactive) -->
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 10v12"></path>
                <path
                  d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"
                ></path>
              </svg>
            </button>
            <button
              v-if="
                message.role === 'assistant' &&
                feedbackState.get(message.id) !== 'up'
              "
              class="toolbar-icon"
              :class="{ active: feedbackState.get(message.id) === 'down' }"
              @click.stop="feedbackMessage(message, 'down')"
              title="不太好"
            >
              <!-- 实心图标 (Active) -->
              <svg
                v-if="feedbackState.get(message.id) === 'down'"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
                ></path>
              </svg>
              <!-- 空心图标 (Inactive) -->
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17 14V2"></path>
                <path
                  d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"
                ></path>
              </svg>
            </button>
            <button
              v-if="message.role === 'assistant'"
              class="toolbar-icon"
              :class="{ active: isSpeaking(message.id) }"
              @click.stop="toggleSpeak(message)"
              title="朗读"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            </button>
            <button
              v-if="
                message.role === 'assistant' &&
                message.messageType !== 'voice-session-end' &&
                message.noRegen !== true
              "
              class="toolbar-icon"
              @click.stop="regenerateMessage(message)"
              title="重新生成"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
              </svg>
            </button>
            <button
              v-if="message.role === 'assistant'"
              class="toolbar-icon"
              @click.stop="shareMessage(message)"
              title="分享消息"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 回到底部按钮 -->
    <button
      v-show="showScrollToBottom"
      class="scroll-to-bottom"
      @click="scrollToBottomSmooth"
      aria-label="回到底部"
    >
      <!-- 向下箭头：竖线+V形 -->
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5L12 17"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <path
          d="M7 13L12 18L17 13"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- 图片预览遮罩 -->
    <div
      v-if="imagePreviewUrl"
      class="image-preview-overlay"
      @click.self="closeImagePreview"
      @wheel.prevent="handleZoom"
    >
      <div class="preview-controls" @click.stop>
        <button class="control-btn" @click="zoomOut" title="缩小">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <span class="zoom-level">{{ Math.round(imageScale * 100) }}%</span>
        <button class="control-btn" @click="zoomIn" title="放大">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <!-- divider removed to avoid horizontal lines -->
        <!-- <div class="divider"></div> -->
        <button
          class="control-btn close-btn"
          @click="closeImagePreview"
          title="关闭"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <img
        :src="imagePreviewUrl"
        alt="预览图"
        class="image-preview"
        :style="{
          transform: `translate(${imageTranslate.x}px, ${imageTranslate.y}px) scale(${imageScale})`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click.stop
        draggable="false"
      />
    </div>

    <!-- 文本选中浮动按钮 -->
    <Teleport to="body">
      <div
        v-if="showQuoteBtn"
        class="quote-float-btn"
        :style="{ top: `${quoteBtnPos.top}px`, left: `${quoteBtnPos.left}px` }"
        @mousedown.prevent="applyQuote"
      >
        <span
          style="
            font-size: 32px;
            line-height: 0.5;
            margin-right: 4px;
            font-family: Georgia, serif;
            font-weight: 900;
            display: inline-block;
            transform: translateY(4px);
          "
          >”</span
        >
        询问小乐
      </div>
    </Teleport>

    <div class="input-container">
      <div class="input-wrapper">
        <!-- 引用预览条 -->
        <div v-if="quoteText" class="quote-preview-bar">
          <div class="quote-content">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="quote-icon"
            >
              <polyline points="15 10 20 15 15 20"></polyline>
              <path d="M4 4v7a4 4 0 0 0 4 4h12"></path>
            </svg>
            <div class="quote-text">
              “{{
                quoteText.replace(/\n/g, " ").substring(0, 100) +
                (quoteText.length > 100 ? "..." : "")
              }}”
            </div>
          </div>
          <button class="close-quote-btn" @click="clearQuote">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 图片预览条 (待发送) -->
        <div v-if="pendingPreviewUrl" class="input-preview-area">
          <div class="preview-card">
            <img
              :src="pendingPreviewUrl"
              class="preview-image"
              alt="待发送图片"
            />
            <button class="preview-close-btn" @click="clearPendingFile">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="input-controls">
          <button class="icon-btn" @click="handleUpload" title="附件">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <div
            ref="messageInput"
            class="message-editor"
            contenteditable="true"
            @keydown.enter="handleEnter"
            @input="handleInput"
            data-placeholder="给 小乐 AI 发送消息..."
          ></div>

          <button
            class="icon-btn"
            :class="{ recording: isRecording }"
            @click="handleVoiceInput"
            title="语音输入"
          >
            <!-- 录音中状态 (动态音量环) -->
            <svg
              v-if="isRecording"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              class="voice-visualizer"
            >
              <!-- 背景圆环 -->
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.18"
              />
              <!-- 动态音量环 -->
              <circle
                cx="12"
                cy="12"
                r="9"
                :stroke="'currentColor'"
                stroke-width="3.5"
                fill="none"
                :stroke-dasharray="2 * Math.PI * 9"
                :stroke-dashoffset="
                  2 * Math.PI * 9 * (1 - Math.min(audioLevel, 1))
                "
                stroke-linecap="round"
                style="
                  transition: stroke-dashoffset 0.15s
                    cubic-bezier(0.4, 0, 0.2, 1);
                "
                opacity="0.95"
              />
              <!-- 中心小圆点 -->
              <circle
                cx="12"
                cy="12"
                r="3.2"
                :fill="'currentColor'"
                opacity="0.85"
              />
            </svg>
            <!-- 默认麦克风图标 -->
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
              ></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>

          <button
            class="icon-btn voice-mode-btn"
            :class="{
              active: isVoiceMode && effectiveButtonMode === 'voice-mode',
              'send-mode': effectiveButtonMode === 'send',
              'stop-mode': effectiveButtonMode === 'stop',
            }"
            @click="handleMainButton"
            :disabled="
              isMobile && effectiveButtonMode === 'send' && !hasInputContent
            "
            :title="
              effectiveButtonMode === 'send'
                ? '发送消息'
                : effectiveButtonMode === 'stop'
                ? '停止生成'
                : '语音模式'
            "
          >
            <!-- 发送图标 (向上箭头) -->
            <svg
              v-if="effectiveButtonMode === 'send'"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="6,11 12,5 18,11" />
            </svg>

            <!-- 停止图标 -->
            <svg
              v-else-if="effectiveButtonMode === 'stop'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="2"></rect>
            </svg>

            <!-- 语音模式图标 -->
            <svg
              v-else
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="12"
                cy="12"
                r="11.5"
                fill="currentColor"
                opacity="0.15"
              ></circle>
              <line x1="8" y1="13.5" x2="8" y2="10.5"></line>
              <line x1="10.5" y1="15" x2="10.5" y2="9"></line>
              <line x1="13.5" y1="15" x2="13.5" y2="9"></line>
              <line x1="16" y1="13.5" x2="16" y2="10.5"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*,.pdf,.docx,.txt,.md,.markdown"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 反馈弹窗 (负面反馈) -->
    <div
      v-if="showFeedbackDialog"
      class="feedback-overlay"
      @click.self="closeFeedbackDialog"
    >
      <div class="feedback-modal">
        <div class="feedback-header">
          <h3>请与我们分享更多信息：</h3>
          <button class="close-btn" @click="closeFeedbackDialog">
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
        <div class="feedback-tags">
          <button
            v-for="tag in feedbackTags"
            :key="tag"
            class="feedback-tag"
            :class="{ selected: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
          <button class="feedback-tag more" @click="openMoreFeedback">
            更多...
          </button>
        </div>
        <div class="feedback-actions" v-if="selectedTags.length > 0">
          <button class="btn-submit" @click="submitBadFeedback">
            提交反馈
          </button>
        </div>
      </div>
    </div>

    <!-- 更多反馈弹窗 -->
    <div
      v-if="showMoreFeedbackDialog"
      class="feedback-overlay"
      @click.self="closeMoreFeedbackDialog"
    >
      <div class="feedback-modal large">
        <div class="feedback-header">
          <h3>提供详细反馈</h3>
          <button class="close-btn" @click="closeMoreFeedbackDialog">
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
        <textarea
          v-model="customFeedbackText"
          class="feedback-textarea"
          placeholder="请详细描述您遇到的问题，帮助我们改进..."
        ></textarea>
        <div class="feedback-footer">
          <button class="btn-cancel" @click="closeMoreFeedbackDialog">
            取消
          </button>
          <button class="btn-submit" @click="submitCustomFeedback">提交</button>
        </div>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <ShareDialog
      v-if="showShareDialog"
      :title="shareDialogTitle"
      :share-url="shareDialogUrl"
      :share-mode="shareMode"
      :messages="shareMessages"
      @close="showShareDialog = false"
    />

    <!-- 语音模式对话框 -->
    <VoiceModeDialog
      ref="voiceModeDialogRef"
      :visible="showVoiceMode"
      @update:visible="onVoiceModeVisibleChange"
      @message="handleVoiceMessage"
      @voice-change="handleVoiceChange"
      @session-end="handleVoiceSessionEnd"
    />
  </div>
</template>

<script setup>
import { API_BASE_URL } from '@/config/apiBase'
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { marked } from "marked";
import markedKatex from "marked-katex-extension";
import hljs from "highlight.js";
import "katex/dist/katex.min.css";
import api from "@/services/api";

import ShareDialog from "@/components/common/ShareDialog.vue";
import VoiceModeDialog from "@/components/voice/VoiceModeDialog.vue";
import Core2ResultMeta from "@/components/chat/Core2ResultMeta.vue";
import { readChatMode, writeChatMode } from "@/chat/chatMode";
import { applyDraftToEditor, consumeHomeDraft } from "@/chat/homeDraft";

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const chatMode = ref(readChatMode());
const onChatModeChange = (event) => { chatMode.value = event.detail === "core2" ? "core2" : "legacy"; };
const switchToLegacy = () => {
  chatMode.value = writeChatMode("legacy");
  window.dispatchEvent(new CustomEvent("xiaole-chat-mode-change", { detail: "legacy" }));
};
const { messages, sessionInfo, isTyping } = storeToRefs(chatStore);
const isEmptyChat = computed(
  () => (messages.value?.length || 0) === 0 && !isTyping.value
);

// 开发环境标志
const isDev = import.meta.env.DEV;

const messageInput = ref(null);
const isMobile = ref(window.innerWidth <= 768);
const chatContainer = ref(null);
const chatViewRoot = ref(null);

// 移动端自定义滚动条
let chatScrollbarTimer = null;
const updateMobileChatScrollbar = () => {
  const el = chatContainer.value;
  const root = chatViewRoot.value;
  if (!el || !root || window.innerWidth > 768) return;

  const { scrollTop, scrollHeight, clientHeight } = el;

  // 如果不需要滚动，隐藏或移除
  if (scrollHeight <= clientHeight) {
    const existing = root.querySelector(".mobile-chat-scrollbar");
    if (existing) existing.style.opacity = "0";
    return;
  }

  // 获取容器的实际位置
  const containerRect = el.getBoundingClientRect();

  // 计算滚动条位置和高度
  const thumbHeight = Math.max(
    (clientHeight / scrollHeight) * clientHeight,
    40
  );
  const maxScroll = scrollHeight - clientHeight;
  const thumbTop =
    containerRect.top + (scrollTop / maxScroll) * (clientHeight - thumbHeight);

  // 创建或更新滚动条
  let thumb = root.querySelector(".mobile-chat-scrollbar");
  if (!thumb) {
    thumb = document.createElement("div");
    thumb.className = "mobile-chat-scrollbar";
    root.appendChild(thumb);
  }

  thumb.style.cssText = `
    position: fixed;
    right: 2px;
    top: ${thumbTop}px;
    width: 4px;
    height: ${thumbHeight}px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 2px;
    pointer-events: none;
    transition: opacity 0.3s;
    z-index: 50;
  `;

  // 浅色模式
  if (document.documentElement.getAttribute("data-theme") === "light") {
    thumb.style.background = "rgba(0, 0, 0, 0.25)";
  }

  thumb.style.opacity = "1";

  // 滚动停止后淡出
  clearTimeout(chatScrollbarTimer);
  chatScrollbarTimer = setTimeout(() => {
    if (thumb) thumb.style.opacity = "0";
  }, 1500);
};

const fileInput = ref(null);
const voiceModeDialogRef = ref(null); // VoiceMode 对话框引用
const isRecording = ref(false);
const isVoiceMode = ref(false);
const recognition = ref(null); // 语音识别实例
// 音频可视化相关状态
const audioLevel = ref(0);
let audioContext = null;
let mediaStream = null;
let analyser = null;
let dataArray = null;
let visualizerFrame = null;

const imagePreviewUrl = ref(null);
const imageScale = ref(1);
const imageTranslate = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const isDraggingFile = ref(false);
const dragCounter = ref(0);
const dragStart = ref({ x: 0, y: 0 });
const showScrollToBottom = ref(false);
const observer = ref(null);

// 待发送文件状态
const pendingFile = ref(null);
const pendingPreviewUrl = ref(null);

// 分享弹窗状态
const showShareDialog = ref(false);
const shareDialogUrl = ref("");
const shareDialogTitle = ref("分享对话");
const shareMode = ref("session"); // 'session' | 'message'
const shareMessages = ref([]); // 分享时的消息列表

// 语音模式状态
const showVoiceMode = ref(false);

// 引用功能状态
const quoteText = ref("");
const tempSelectedText = ref("");
const showQuoteBtn = ref(false);
const quoteBtnPos = ref({ top: 0, left: 0 });
const imageLoadErrors = ref(new Set()); // 跟踪图片加载错误
const feedbackState = ref(new Map());
const speakingMessageId = ref(null);
const inputContent = ref("");
const shouldScrollToBottom = ref(false); // 标志位：是否需要滚动到底部
const isLoadingSession = ref(true); // 初始就设置为 true，默认隐藏
const sessionLoadError = ref(null); // 会话加载错误信息
let currentSpeech = null;
let autoStickRaf = null;
let loadingTimeout = null; // 加载超时定时器

// 反馈相关状态
const showFeedbackDialog = ref(false);
const showMoreFeedbackDialog = ref(false);
const currentFeedbackMessageId = ref(null);
const selectedTags = ref([]);
const customFeedbackText = ref("");
const feedbackTags = [
  "不应该使用记忆",
  "不喜欢此人物",
  "不喜欢这种风格",
  "与事实不符",
  "未完全遵循指令",
];

// 消息折叠状态
const collapsedMessages = ref(new Set());
const MESSAGE_COLLAPSE_THRESHOLD = 800; // 字符数阈值

const shouldShowExpandButton = (content, role) => {
  // 只折叠用户消息
  if (role !== "user") return false;
  if (!content) return false;
  // 去除HTML标签后计算纯文本长度
  const textLength = content.replace(/<[^>]*>/g, "").length;
  return textLength > MESSAGE_COLLAPSE_THRESHOLD;
};

const isMessageCollapsed = (messageId) => {
  return collapsedMessages.value.has(messageId);
};

const toggleMessageExpand = (messageId) => {
  if (collapsedMessages.value.has(messageId)) {
    collapsedMessages.value.delete(messageId);
  } else {
    collapsedMessages.value.add(messageId);
  }
  // 强制触发响应式更新
  collapsedMessages.value = new Set(collapsedMessages.value);
};

// 监听新消息，自动折叠长消息
watch(
  messages,
  (newMessages) => {
    newMessages.forEach((msg) => {
      if (shouldShowExpandButton(msg.content, msg.role)) {
        // 新消息默认折叠
        if (!collapsedMessages.value.has(msg.id)) {
          collapsedMessages.value.add(msg.id);
        }
      }
    });
  },
  { deep: true }
);

// 判断是否有输入内容
const hasInputContent = computed(() => {
  return inputContent.value.trim().length > 0 || !!pendingFile.value;
});

// 按钮状态：voice-mode(语音模式) / send(发送) / stop(停止)
const buttonMode = computed(() => {
  if (isTyping.value) return "stop";
  if (hasInputContent.value) return "send";
  return "voice-mode";
});

// 移动端强制为发送/停止模式（无输入时禁用发送按钮）
const effectiveButtonMode = computed(() => {
  if (isMobile.value) {
    return isTyping.value ? "stop" : "send";
  }
  return buttonMode.value;
});

// 随机选择问候语
const selectRandomGreeting = () => {
  const hour = new Date().getHours();
  let list = [];

  if (hour >= 5 && hour < 11) {
    list = [
      "早上好！新的一天开始了，准备好出发了吗？",
      "早安！今天有什么计划？",
      "一日之计在于晨，加油！",
      "早上好，愿你今天充满活力！",
    ];
  } else if (hour >= 11 && hour < 14) {
    list = [
      "中午好！记得按时吃饭哦。",
      "午休时间，要不要聊聊？",
      "中午好，补充点能量继续前行吧。",
    ];
  } else if (hour >= 14 && hour < 18) {
    list = [
      "下午好！喝杯茶休息一下吧。",
      "下午好，工作学习辛苦了。",
      "午后时光，有什么我可以帮你的？",
    ];
  } else if (hour >= 18 && hour < 23) {
    list = [
      "晚上好！今天过得怎么样？",
      "晚上好，卸下一天的疲惫，聊聊吧。",
      "晚上好，我在听。",
    ];
  } else {
    list = [
      "夜深了，还在忙吗？注意休息哦。",
      "这么晚了，有什么心事吗？",
      "夜深人静，正好思考。我在。",
      "还不睡吗？小乐陪你聊聊。",
    ];
  }

  return list[Math.floor(Math.random() * list.length)];
};

const currentGreeting = ref(selectRandomGreeting());

// 配置 marked 使用代码高亮
const renderer = {
  code(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return `<pre><code class="hljs language-${language}">${
      hljs.highlight(code, { language }).value
    }</code></pre>`;
  },
  link(href, title, text) {
    // 兼容 marked 不同版本的参数传递方式
    let url = href;
    let tit = title;
    let txt = text;

    if (typeof href === "object" && href !== null) {
      url = href.href;
      tit = href.title;
      txt = href.text;
    }

    return `<a href="${url}" title="${
      tit || ""
    }" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  },
  table(header, body) {
    // 兼容 marked 不同版本的参数传递方式
    let thead = header;
    let tbody = body;

    if (typeof header === "object" && header !== null) {
      thead = header.header;
      tbody = header.body;
    }

    return `<div class="table-wrapper"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  },
};

marked.use({ renderer });

marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false, // 关键：不对 HTML 进行转义
  headerIds: false,
});

// 重要：KaTeX 配置必须在最后，否则会被覆盖
marked.use(
  markedKatex({
    throwOnError: false,
    output: "html",
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  })
);

const sessionId = computed(() => route.params.sessionId);

watch(
  sessionId,
  async (newId) => {
    // 清除之前的超时
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }

    if (newId) {
      isLoadingSession.value = true;
      sessionLoadError.value = null; // 清除之前的错误

      // 设置5秒超时保护
      loadingTimeout = setTimeout(() => {
        if (isDev) console.warn("⚠️ 会话加载超时,强制停止加载动画");
        isLoadingSession.value = false;
        if (!sessionLoadError.value) {
          sessionLoadError.value =
            "加载超时，请检查网络连接或后端服务是否正常运行";
        }
      }, 5000);

      try {
        await chatStore.loadSession(newId);
        if (isDev) {
          console.log("✅ loadSession 完成,准备显示UI");
          console.log("📊 当前消息数量:", chatStore.messages.length);
          console.log("📊 当前会话ID:", chatStore.currentSessionId);
        }

        // 先停止加载动画
        clearTimeout(loadingTimeout);
        isLoadingSession.value = false;
        sessionLoadError.value = null; // 清除错误

        // 然后设置滚动位置
        await nextTick();
        requestAnimationFrame(() => {
          if (chatContainer.value) {
            // 使用统一的滚动函数，确保移动端第一条消息不被遮挡
            stickToBottomImmediate();
          }
        });
      } catch (error) {
        console.error("加载会话失败:", error);
        clearTimeout(loadingTimeout);
        isLoadingSession.value = false;

        // 根据错误类型设置友好的错误信息
        if (error.response?.status === 404) {
          sessionLoadError.value = `会话不存在或已被删除 (ID: ${newId})`;
        } else if (error.response?.status === 401) {
          sessionLoadError.value = "认证失败，请重新登录";
          // 触发登出
          const authStore = useAuthStore();
          authStore.logout();
          router.push({ name: "Login" });
        } else if (
          error.code === "ECONNABORTED" ||
          error.message?.includes("timeout")
        ) {
          sessionLoadError.value =
            "请求超时，请检查网络连接或后端服务是否正常运行";
        } else if (
          error.message?.includes("Network Error") ||
          !error.response
        ) {
          sessionLoadError.value =
            "无法连接到后端服务，请确认后端服务是否在运行 (端口 8000)";
        } else {
          const errorMsg =
            error.formattedMessage ||
            error.message ||
            error.response?.data?.detail ||
            "未知错误";
          sessionLoadError.value = `加载失败: ${errorMsg}`;
        }
      }
    } else {
      chatStore.clearCurrentSession();
      isLoadingSession.value = false;
      sessionLoadError.value = null;
    }
  },
  { immediate: true }
);

// 重试加载会话
const handleRetryLoadSession = () => {
  const currentId = route.params.sessionId;
  if (currentId) {
    sessionLoadError.value = null;
    // 触发重新加载
    chatStore
      .loadSession(currentId)
      .then(() => {
        sessionLoadError.value = null;
        isLoadingSession.value = false;
      })
      .catch((error) => {
        // 错误处理已在 watch 中完成
        console.error("重试加载失败:", error);
      });
  }
};

// 跳转到新建对话
const handleGoToNewChat = () => {
  sessionLoadError.value = null;
  chatStore.clearCurrentSession();
  router.push({ name: "Chat" });
};

// 是否接近底部
const isNearBottom = () => {
  const el = chatContainer.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
};

// 立即粘到底部（无平滑动画，避免频繁重绘卡顿）
const stickToBottomImmediate = () => {
  const el = chatContainer.value;
  if (!el) return;

  const maxScroll = el.scrollHeight - el.clientHeight;

  // 如果内容不足以滚动，保持在顶部
  if (maxScroll <= 0) {
    el.scrollTop = 0;
    return;
  }

  // 正常滚动到底部
  el.scrollTop = maxScroll;
};

// 在 AI 打字期间，使用 rAF 持续粘底（仅在接近底部时）
const startAutoStick = () => {
  if (autoStickRaf) return;
  const step = () => {
    if (chatContainer.value && isNearBottom()) {
      stickToBottomImmediate();
    }
    autoStickRaf = requestAnimationFrame(step);
  };
  autoStickRaf = requestAnimationFrame(step);
};

const stopAutoStick = () => {
  if (autoStickRaf) cancelAnimationFrame(autoStickRaf);
  autoStickRaf = null;
};

watch(
  messages,
  () => {
    // 如果正在加载会话，不触发自动滚动（由 loadSession 负责初始定位）
    if (isLoadingSession.value) return;

    nextTick(() => {
      // 只在用户发送消息后或 AI 正在打字时才滚动
      if (shouldScrollToBottom.value || isTyping.value) {
        // 对于流式生成，用即时粘底减少抖动
        stickToBottomImmediate();
        // 双重保险：确保渲染完成后再次滚动，防止内容撑开导致未到底
        setTimeout(stickToBottomImmediate, 50);
        shouldScrollToBottom.value = !!isTyping.value;
      }
    });
  },
  { deep: true }
);

// 监听 AI 打字状态，用于语音模式自动朗读
watch(isTyping, (newVal, oldVal) => {
  // 流式期间启用 rAF 粘底
  if (newVal) startAutoStick();
  else stopAutoStick();

  if (oldVal && !newVal && isVoiceMode.value) {
    // AI 停止打字，且处于语音模式
    const lastMessage = messages.value[messages.value.length - 1];
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.messageType !== "voice-session-end"
    ) {
      speakAndResumeMic(lastMessage.content);
    }
  }
});

// 音色ID映射到百度TTS的person参数
const voiceIdToPersonMap = {
  vale: 0, // 度小宇（男）
  juniper: 1, // 度小美（女）
  arbor: 3, // 度逍遥（男）
  sage: 4, // 度丫丫（女）
};

function getPersonFromVoiceId(voiceId) {
  return voiceIdToPersonMap[voiceId] || 0;
}

// 清洗文本：去除表情、括号内情绪提示、Markdown强调、过多空白
function cleanTtsText(raw) {
  if (!raw) return "";
  let txt = raw
    .replace(/\*\*(.*?)\*\*/g, "$1") // 去除 **bold**
    .replace(/[_`~>*#-]/g, " ") // 去除常见 Markdown 标记
    .replace(/[\p{Extended_Pictographic}]/gu, "") // 去除 emoji
    .replace(/（[^）]{0,20}）/g, "") // 删除短括号提示
    .replace(/\([^\)]{0,20}\)/g, "") // 删除 () 内短提示
    .replace(/\s+/g, " ") // 压缩空白
    .trim();
  // 如果太短，保持原样；否则返回清洗后
  return txt.length ? txt : raw;
}

// 语音模式下AI回复自动朗读，朗读结束后自动恢复麦克风监听
// 语音模式下AI回复自动朗读（Baidu TTS），朗读结束后自动恢复麦克风监听
async function speakAndResumeMic(text) {
  stopSpeech();
  const voiceId = localStorage.getItem("selectedVoice") || "juniper";
  const person = getPersonFromVoiceId(voiceId);
  const clean = cleanTtsText(text);
  try {
    const data = await api.synthesizeVoice(clean, {
      person,
      speed: 7,
      pitch: 4,
      volume: 3,
      audio_format: "mp3",
    });

    const base64Audio = data.audio_base64 || data.audio; // 兼容旧字段
    const mimeType = data.mime || data.mime_type;
    if (!base64Audio || !mimeType) throw new Error("TTS 响应无音频");
    const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
    audio.onplay = () => {
      speakingMessageId.value =
        messages.value[messages.value.length - 1]?.id || null;
      voiceModeDialogRef.value?.startSpeaking();
    };
    audio.onended = () => {
      speakingMessageId.value = null;
      voiceModeDialogRef.value?.stopSpeaking();
      if (isVoiceMode.value && recognition.value && !isRecording.value) {
        try {
          recognition.value.start();
          isRecording.value = true;
          startVisualizer();
        } catch (e) {}
      }
    };
    audio.onerror = (e) => {
      console.error("🔊 音频播放错误:", e);
      speakingMessageId.value = null;
      voiceModeDialogRef.value?.stopSpeaking();
    };
    currentSpeech = audio;
    await audio.play();
  } catch (err) {
    speakingMessageId.value = null;
    console.error("🔊 TTS 播放失败:", err);
    alert("语音播放失败: " + err.message);
  }
}

const renderMarkdown = (content) => {
  if (!content) return "";

  // 清理所有不可见控制字符（保留常用换行、制表符）
  let text = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 统一 LaTeX 定界符，并确保公式前后有空格（避免和中文粘连导致无法识别）
  text = text.replace(/\\\(\s*(.+?)\s*\\\)/g, (_, f) => " $" + f.trim() + "$ ");
  text = text.replace(
    /\\\[\s*(.+?)\s*\\\]/gs,
    (_, f) => " $$" + f.trim() + "$$ "
  );

  const result = marked.parse(text);
  return result;
};
const copiedMessageId = ref(null);
const editingMessageId = ref(null);
const editingContent = ref("");
const isSavingEdit = ref(false); // 防止重复提交

// ========== 下拉刷新功能 ==========
const pullRefreshState = ref("idle"); // idle | pulling | ready | loading
const pullDistance = ref(0);
let pullStartY = 0;
let isPulling = false;
const PULL_THRESHOLD = 60; // 触发刷新的阈值

const handlePullRefreshStart = (event) => {
  // 只在移动端且滚动到顶部时启用
  if (!isMobile.value) return;
  const container = chatContainer.value;
  if (!container || container.scrollTop > 5) return;

  pullStartY = event.touches[0].clientY;
  isPulling = true;
};

const handlePullRefreshMove = (event) => {
  if (!isPulling || pullRefreshState.value === "loading") return;

  const container = chatContainer.value;
  if (!container || container.scrollTop > 5) {
    isPulling = false;
    pullDistance.value = 0;
    pullRefreshState.value = "idle";
    return;
  }

  const currentY = event.touches[0].clientY;
  const distance = currentY - pullStartY;

  if (distance > 0) {
    // 阻止默认滚动行为
    event.preventDefault();
    // 使用阻尼效果
    pullDistance.value = Math.min(distance * 0.5, 100);
    pullRefreshState.value =
      pullDistance.value >= PULL_THRESHOLD ? "ready" : "pulling";
  }
};

const handlePullRefreshEnd = async () => {
  if (!isPulling) return;
  isPulling = false;

  if (pullRefreshState.value === "ready") {
    pullRefreshState.value = "loading";
    pullDistance.value = PULL_THRESHOLD;

    try {
      // 重新加载当前会话
      const sessionId = route.params.id;
      if (sessionId) {
        await chatStore.loadSession(sessionId);
        // 震动反馈
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    } catch (error) {
      console.error("刷新失败:", error);
    }

    // 延迟隐藏，让用户看到加载完成
    setTimeout(() => {
      pullDistance.value = 0;
      pullRefreshState.value = "idle";
    }, 300);
  } else {
    // 未达到阈值，回弹
    pullDistance.value = 0;
    pullRefreshState.value = "idle";
  }
};
// ========== 下拉刷新结束 ==========

const copyMessage = async (message) => {
  try {
    const text = message?.content || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);

    // 显示复制成功状态
    copiedMessageId.value = message.id;
    setTimeout(() => {
      if (copiedMessageId.value === message.id) {
        copiedMessageId.value = null;
      }
    }, 2000);
  } catch (_) {}
};

const editMessage = (message) => {
  // 编辑用户消息：将消息内容填充到输入框
  if (message?.role !== "user") return;
  // 语音消息不允许编辑
  if (message?.messageType === "voice") return;
  editingMessageId.value = message.id;
  editingContent.value = message.content;

  // 自动调整高度
  nextTick(() => {
    const textarea = document.getElementById(`edit-textarea-${message.id}`);
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      textarea.focus();
    }
  });
};

const cancelEdit = () => {
  editingMessageId.value = null;
  editingContent.value = "";
};

const saveEdit = async (message) => {
  if (isSavingEdit.value) return;

  const newContent = editingContent.value.trim();
  if (!newContent || newContent === message.content) {
    cancelEdit();
    return;
  }

  isSavingEdit.value = true;
  try {
    // 找到当前消息的索引
    const index = messages.value.findIndex((m) => m.id === message.id);
    if (index !== -1) {
      // 如果是已保存的消息（非临时ID），调用后端删除该消息及其后续消息
      if (message.id && !String(message.id).startsWith("temp-")) {
        await chatStore.deleteMessageApi(message.id);
      }

      // 1. 更新当前消息内容
      messages.value[index].content = newContent;
      // 标记为临时ID，等待发送成功后更新为新ID
      messages.value[index].id = `temp-edit-${Date.now()}`;

      // 2. 删除当前消息之后的所有消息（通常是 AI 的回复）
      // 注意：splice 会修改原数组
      if (index < messages.value.length - 1) {
        messages.value.splice(index + 1);
      }

      // 3. 退出编辑模式
      cancelEdit();

      // 4. 重新发送请求
      // 注意：如果原消息有图片但是base64数据,则忽略
      let imagePath = message.image_path;
      if (imagePath && !imagePath.startsWith("/uploads")) {
        console.warn("⚠️ Edit: 忽略base64图片数据,仅支持已上传的图片");
        imagePath = null;
      }

      // chatStore.sendMessage 不会重复添加用户消息，只会触发 AI 回复
      await chatStore.sendMessage(newContent, imagePath, router);
    }
  } catch (e) {
    console.error("Save edit failed:", e);
  } finally {
    isSavingEdit.value = false;
  }
};

const autoResizeTextarea = (e) => {
  const target = e.target;
  target.style.height = "auto";
  target.style.height = target.scrollHeight + "px";
};

const isSpeaking = (messageId) => {
  return speakingMessageId.value === messageId;
};

const toggleSpeak = async (message) => {
  if (!message?.content) return;
  if (isSpeaking(message.id)) {
    stopSpeech();
    return;
  }
  stopSpeech();
  try {
    const voiceId = localStorage.getItem("selectedVoice") || "juniper";
    const person = getPersonFromVoiceId(voiceId);
    const clean = cleanTtsText(message.content);
    const data = await api.synthesizeVoice(clean, {
      person,
      speed: 7,
      pitch: 4,
      volume: 3,
      audio_format: "mp3",
    });
    const base64Audio = data.audio_base64 || data.audio;
    const mimeType = data.mime || data.mime_type;
    if (!base64Audio || !mimeType) throw new Error("TTS 响应无音频");
    const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
    audio.onplay = () => {
      speakingMessageId.value = message.id;
      voiceModeDialogRef.value?.startSpeaking();
    };
    audio.onended = () => {
      speakingMessageId.value = null;
      currentSpeech = null;
      voiceModeDialogRef.value?.stopSpeaking();
      if (isVoiceMode.value) {
        handleVoiceInput();
      }
    };
    audio.onerror = () => {
      speakingMessageId.value = null;
      currentSpeech = null;
      voiceModeDialogRef.value?.stopSpeaking();
    };
    currentSpeech = audio;
    audio.play();
  } catch (error) {
    console.error("TTS朗读失败:", error);
    speakingMessageId.value = null;
  }
};

const stopSpeech = () => {
  if (currentSpeech) {
    try {
      if (typeof currentSpeech.pause === "function") {
        currentSpeech.pause();
        currentSpeech.currentTime = 0;
      }
    } catch (e) {}
    speakingMessageId.value = null;
    currentSpeech = null;
  }
};

const regenerateMessage = async (message) => {
  try {
    if (message?.role !== "assistant") return;

    // 找到当前 AI 消息的索引
    const index = messages.value.findIndex((m) => m.id === message.id);
    if (index === -1) return;

    let lastUserMessage = null;
    // 向前查找最近的用户消息
    for (let i = index - 1; i >= 0; i--) {
      if (messages.value[i].role === "user") {
        lastUserMessage = messages.value[i];
        break;
      }
    }

    if (!lastUserMessage) return;

    // 保存必要信息
    const userMsgId = lastUserMessage.id;
    const aiMsgId = message.id; // 当前要重新生成的 AI 消息 ID
    const content = lastUserMessage.content;
    let imagePath = lastUserMessage.image_path;

    // 如果imagePath是base64数据,过滤掉(因为后端无法处理base64路径)
    // 只保留服务器路径(以/uploads开头)
    if (imagePath && !imagePath.startsWith("/uploads")) {
      console.warn("⚠️ Regenerate: 忽略base64图片数据,仅支持已上传的图片");
      imagePath = null;
    }

    // 1. 立即从前端移除 (防止重复点击)
    const userMsgIndex = messages.value.findIndex((m) => m.id === userMsgId);
    const aiMsgIndex = messages.value.findIndex((m) => m.id === aiMsgId);

    if (userMsgIndex !== -1 && aiMsgIndex !== -1) {
      // 只删除这一对用户消息和 AI 回复，不影响后续对话
      // 先删除索引较大的（AI消息），再删除用户消息
      if (aiMsgIndex > userMsgIndex) {
        messages.value.splice(aiMsgIndex, 1);
        messages.value.splice(userMsgIndex, 1);
      } else {
        messages.value.splice(userMsgIndex, 1);
        messages.value.splice(aiMsgIndex, 1);
      }
    } else if (aiMsgIndex !== -1) {
      // 如果找不到用户消息，只删除当前的 AI 消息
      messages.value.splice(aiMsgIndex, 1);
    }

    // 2. 立即插入新消息
    messages.value.push({
      id: `temp-regen-${Date.now()}`,
      role: "user",
      content: content,
      image_path: imagePath,
      timestamp: new Date().toISOString(),
    });

    // 3. 后端操作 - 删除用户消息和 AI 回复消息
    const deletePromises = [];
    if (userMsgId && !String(userMsgId).startsWith("temp-")) {
      deletePromises.push(chatStore.deleteMessageApi(userMsgId));
    }
    if (aiMsgId && !String(aiMsgId).startsWith("temp-")) {
      deletePromises.push(chatStore.deleteMessageApi(aiMsgId));
    }
    // 并行删除，不阻塞后续发送
    Promise.all(deletePromises).catch((e) => {
      console.error("Failed to delete messages from backend:", e);
    });

    // 4. 重新发送
    await chatStore.sendMessage(content, imagePath, router);
  } catch (e) {
    console.error("Regenerate failed:", e);
  }
};

const shareMessage = async (message) => {
  if (!message?.content) return;

  const sessionId = route.params.sessionId;
  if (sessionId) {
    // 单条消息分享：找到这条消息及其上下文
    const msgIndex = messages.value.findIndex(
      (m) => (m.id || m.message_id) === (message.id || message.message_id)
    );
    // 获取当前消息和之前的一条用户消息作为预览
    const contextMessages = [];
    if (msgIndex > 0) {
      contextMessages.push(messages.value[msgIndex - 1]);
    }
    contextMessages.push(message);

    shareMode.value = "message";
    shareDialogTitle.value = sessionInfo.value?.title || "分享消息";
    shareMessages.value = contextMessages;
    shareDialogUrl.value =
      typeof window !== "undefined" && window.location
        ? `${window.location.origin}/share/${sessionId}`
        : `/share/${sessionId}`;
    showShareDialog.value = true;
  } else {
    // 如果没有会话ID，直接复制文本
    try {
      await navigator.clipboard.writeText(message.content);
      alert("内容已复制到剪贴板");
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }
};

// 分享整个会话
const shareSession = () => {
  const sessionId = route.params.sessionId;
  if (sessionId) {
    shareMode.value = "session";
    shareDialogTitle.value = sessionInfo.value?.title || "分享对话";
    shareMessages.value = messages.value.slice(-4); // 最近4条消息作为预览
    shareDialogUrl.value =
      typeof window !== "undefined" && window.location
        ? `${window.location.origin}/share/${sessionId}`
        : `/share/${sessionId}`;
    showShareDialog.value = true;
  }
};

const formatImagePath = (path) => {
  if (!path) return "";
  // 如果是 base64 或 blob 或 http 开头，直接返回
  if (
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("http")
  ) {
    return path;
  }
  // 统一路径格式：确保以 / 开头
  // 移除可能存在的重复斜杠
  let normalizedPath = path.replace(/^\/+/, "/");
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = "/" + normalizedPath;
  }

  // 生产环境：图片存储在后端服务器，需要拼接 API 基础 URL
  if (API_BASE_URL) {
    const fullUrl = `${API_BASE_URL}${normalizedPath}`;
    if (import.meta.env.DEV) {
      console.log(`[formatImagePath] 生产环境图片 URL: "${fullUrl}"`);
    }
    return fullUrl;
  }

  // 调试日志（开发环境）
  if (import.meta.env.DEV && path !== normalizedPath) {
    console.log(
      `[formatImagePath] 路径规范化: "${path}" -> "${normalizedPath}"`
    );
  }
  return normalizedPath;
};

// 获取完整的图片 URL（安全地访问 window）
const getFullImageUrl = (path) => {
  if (!path) return "";
  const formattedPath = formatImagePath(path);
  if (formattedPath.startsWith("http")) {
    return formattedPath;
  }
  // 安全地访问 window.location.origin
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.origin}${formattedPath}`;
  }
  return formattedPath;
};

const handleImageError = (event) => {
  const img = event.target;
  const src = img.src || img.currentSrc || "";
  if (src) {
    console.error("❌ 图片加载失败:", src);
    console.error("   图片元素:", img);
    console.error("   完整 URL:", img.src);
    // 同时记录规范化路径和完整 URL
    imageLoadErrors.value.add(src);
    // 如果是相对路径，也记录完整 URL
    if (
      !src.startsWith("http") &&
      typeof window !== "undefined" &&
      window.location
    ) {
      const fullUrl = `${window.location.origin}${src}`;
      imageLoadErrors.value.add(fullUrl);
      console.error("   完整 URL (已记录):", fullUrl);
    }
  }
};

const handleImageLoad = (event) => {
  const img = event.target;
  const src = img.src || img.currentSrc || "";
  if (src) {
    // 图片加载成功，移除错误标记
    imageLoadErrors.value.delete(src);
    // 如果是相对路径，也移除完整 URL 的错误标记
    if (
      !src.startsWith("http") &&
      typeof window !== "undefined" &&
      window.location
    ) {
      const fullUrl = `${window.location.origin}${src}`;
      imageLoadErrors.value.delete(fullUrl);
    }
    if (import.meta.env.DEV) {
      console.log("✅ 图片加载成功:", src);
    }
  }
};

const checkImageError = (message) => {
  if (!message.image_path) return false;
  const formattedPath = formatImagePath(message.image_path);
  // 检查完整 URL（包括协议和域名）
  const fullUrl = getFullImageUrl(message.image_path);
  return (
    imageLoadErrors.value.has(formattedPath) ||
    imageLoadErrors.value.has(fullUrl)
  );
};

// 将秒格式化为 mm:ss 显示在语音消息上
const formatDuration = (seconds) => {
  const mins = Math.floor((seconds || 0) / 60);
  const secs = Math.floor((seconds || 0) % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const scrollToTop = () => {
  if (!chatContainer.value) return;
  chatContainer.value.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const scrollToBottom = () => {
  if (!chatContainer.value) return;
  const container = chatContainer.value;
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth",
  });
};

const onScroll = () => {
  const el = chatContainer.value;
  if (!el) return;
  // 检查是否接近底部
  const nearBottom = isNearBottom();
  showScrollToBottom.value = !nearBottom;

  // 滚动时隐藏引用按钮，避免位置错乱
  if (showQuoteBtn.value) {
    showQuoteBtn.value = false;
  }

  // 更新移动端自定义滚动条
  updateMobileChatScrollbar();
};

const scrollToBottomSmooth = () => {
  scrollToBottom();
};

const openImage = (src) => {
  if (!src) return;
  imagePreviewUrl.value = src;
  imageScale.value = 1;
  imageTranslate.value = { x: 0, y: 0 };
  try {
    document.body.style.overflow = "hidden";
  } catch (_) {}
};

const closeImagePreview = () => {
  imagePreviewUrl.value = null;
  try {
    document.body.style.overflow = "";
  } catch (_) {}
};

const handleZoom = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(0.1, Math.min(5, imageScale.value + delta));
  imageScale.value = parseFloat(newScale.toFixed(2));
};

const zoomIn = () => {
  const newScale = Math.min(5, imageScale.value + 0.2);
  imageScale.value = parseFloat(newScale.toFixed(2));
};

const zoomOut = () => {
  const newScale = Math.max(0.1, imageScale.value - 0.2);
  imageScale.value = parseFloat(newScale.toFixed(2));
};

const startDrag = (e) => {
  e.preventDefault();
  isDragging.value = true;
  dragStart.value = {
    x: e.clientX - imageTranslate.value.x,
    y: e.clientY - imageTranslate.value.y,
  };
};

const onDrag = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  imageTranslate.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y,
  };
};

const stopDrag = () => {
  isDragging.value = false;
};

// 触摸手势支持
const touchStartDistance = ref(0);
const touchStartScale = ref(1);
const lastTouchPos = ref({ x: 0, y: 0 });
const lastTapTime = ref(0);

const getDistance = (t1, t2) => {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const handleTouchStart = (e) => {
  if (e.touches.length === 1) {
    // 单指拖拽
    isDragging.value = true;
    lastTouchPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // 双指缩放
    isDragging.value = false;
    const dist = getDistance(e.touches[0], e.touches[1]);
    touchStartDistance.value = dist;
    touchStartScale.value = imageScale.value;
  }
};

const handleTouchMove = (e) => {
  e.preventDefault(); // 防止滚动

  if (e.touches.length === 1 && isDragging.value) {
    // 处理拖拽
    const dx = e.touches[0].clientX - lastTouchPos.value.x;
    const dy = e.touches[0].clientY - lastTouchPos.value.y;
    imageTranslate.value = {
      x: imageTranslate.value.x + dx,
      y: imageTranslate.value.y + dy,
    };
    lastTouchPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // 处理缩放
    const dist = getDistance(e.touches[0], e.touches[1]);
    if (touchStartDistance.value > 0) {
      const scale = dist / touchStartDistance.value;
      const newScale = touchStartScale.value * scale;
      imageScale.value = Math.max(
        0.1,
        Math.min(5, parseFloat(newScale.toFixed(2)))
      );
    }
  }
};

const handleTouchEnd = (e) => {
  if (e.touches.length === 0) {
    isDragging.value = false;

    // 双击缩放检测
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime.value;
    if (tapLength < 300 && tapLength > 0) {
      if (imageScale.value > 1.1) {
        // 如果已经放大，则还原
        imageScale.value = 1;
        imageTranslate.value = { x: 0, y: 0 };
      } else {
        // 如果未放大，则放大到 2.5 倍
        imageScale.value = 2.5;
      }
    }
    lastTapTime.value = currentTime;
  }
};

// 委托点击 Markdown 图片放大预览
const onChatClick = (e) => {
  const target = e.target;
  if (!target) return;
  if (
    target.tagName === "IMG" &&
    target.closest &&
    target.closest(".md-content")
  ) {
    const src = target.currentSrc || target.src;
    openImage(src);
  }
};

// 引用功能
const applyQuote = () => {
  if (!tempSelectedText.value) return;

  // 每次引用只保留最后一次的内容，覆盖之前的引用
  quoteText.value = tempSelectedText.value;

  showQuoteBtn.value = false;
  tempSelectedText.value = ""; // 清除临时选中

  // 清除选区，避免视觉干扰
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
};

const clearQuote = () => {
  quoteText.value = "";
};

// 监听文本选择
const handleSelection = () => {
  const selection = window.getSelection();

  // 基础检查：是否有选区，是否折叠（光标状态）
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    showQuoteBtn.value = false;
    return;
  }

  const text = selection.toString().trim();

  // 检查是否有文本内容，且长度至少为3
  if (!text || text.length < 3) {
    showQuoteBtn.value = false;
    return;
  }

  // 检查选区是否在聊天容器内
  // 只要起点或终点在容器内即可
  const isInside =
    chatContainer.value &&
    (chatContainer.value.contains(selection.anchorNode) ||
      chatContainer.value.contains(selection.focusNode));

  if (isInside) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    tempSelectedText.value = text;

    // 计算位置，优先显示在上方，如果空间不足则显示在下方
    const viewportHeight = window.innerHeight;
    const topSpace = rect.top;

    let top;
    if (topSpace > 60) {
      top = rect.top - 45; // 上方
    } else {
      top = rect.bottom + 10; // 下方
    }

    // 水平居中，但防止溢出屏幕
    let left = rect.left + rect.width / 2 - 40;
    if (left < 10) left = 10;
    if (left + 80 > window.innerWidth) left = window.innerWidth - 90;

    quoteBtnPos.value = { top, left };
    showQuoteBtn.value = true;
  } else {
    showQuoteBtn.value = false;
  }
};

// 在 onMounted 中添加 selectionchange 监听
// 注意：selectionchange 是 document 级别的事件

// 反馈相关逻辑
const toggleTag = (tag) => {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  } else {
    selectedTags.value.push(tag);
  }
};

const openMoreFeedback = () => {
  showMoreFeedbackDialog.value = true;
};

const closeFeedbackDialog = () => {
  showFeedbackDialog.value = false;
  selectedTags.value = [];
  currentFeedbackMessageId.value = null;
};

const closeMoreFeedbackDialog = () => {
  showMoreFeedbackDialog.value = false;
  customFeedbackText.value = "";
};

const submitBadFeedback = async () => {
  if (!currentFeedbackMessageId.value) return;

  try {
    await chatStore.submitFeedback({
      message_id: currentFeedbackMessageId.value,
      rating: "down",
      tags: selectedTags.value,
      comment: customFeedbackText.value,
    });

    // 更新本地状态
    feedbackState.value.set(currentFeedbackMessageId.value, "down");

    closeFeedbackDialog();
    closeMoreFeedbackDialog();
  } catch (e) {
    console.error("Feedback failed:", e);
  }
};

const submitCustomFeedback = async () => {
  await submitBadFeedback();
};

// 为代码块添加复制按钮等增强，避免重复添加
const enhanceRenderedContent = () => {
  if (!chatContainer.value) return;
  const blocks = chatContainer.value.querySelectorAll(
    ".md-content pre:not([data-has-copy])"
  );

  blocks.forEach((pre) => {
    pre.setAttribute("data-has-copy", "1");

    // 提取语言标签
    const codeEl = pre.querySelector("code");
    const cls = codeEl?.className || "";
    const m = cls.match(/language-([a-z0-9+#-]+)/i);
    const lang = m ? m[1].toLowerCase() : "plaintext";

    // 创建头部容器
    const header = document.createElement("div");
    header.className = "code-header";

    // 语言标签
    const label = document.createElement("span");
    label.className = "code-lang";
    label.textContent = lang;
    header.appendChild(label);

    // 复制按钮
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="copy-text">复制代码</span>
    `;
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        const code = pre.querySelector("code");
        const text = code ? code.innerText : pre.innerText;
        await navigator.clipboard.writeText(text);
        const textSpan = btn.querySelector(".copy-text");
        if (textSpan) {
          textSpan.textContent = "已复制";
          btn.classList.add("copied");
          setTimeout(() => {
            textSpan.textContent = "复制代码";
            btn.classList.remove("copied");
          }, 1500);
        }
      } catch (_) {}
    });
    header.appendChild(btn);

    // 将header插入pre顶部
    pre.insertBefore(header, pre.firstChild);
  });
};

const handleInput = () => {
  // 更新输入内容状态
  inputContent.value = messageInput.value?.innerText || "";

  // 处理输入，清理空内容以显示占位符
  if (messageInput.value && messageInput.value.innerText.trim() === "") {
    messageInput.value.innerHTML = "";
  }
};

const handleEnter = (e) => {
  if (!e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const sendMessage = async () => {
  let content = messageInput.value?.innerText?.trim();

  // 如果有引用内容，拼接到消息头部
  if (quoteText.value) {
    // 确保每一行都被引用
    const quote =
      quoteText.value
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n") + "\n\n";
    content = quote + (content || "");
  }

  // 如果没有内容且没有待发送文件，且不在打字中，则返回
  if ((!content && !pendingFile.value) || isTyping.value) return;

  if (chatMode.value === "core2" && pendingFile.value) {
    messages.value.push({
      id: `core2-attachment-${Date.now()}`,
      role: "assistant",
      content: "小乐 2.0 实验模式暂不支持附件，请移除附件或切回小乐 1.0。",
      status: "done",
      core2: true,
    });
    return;
  }

  // 立即清空输入框和引用
  messageInput.value.innerText = "";
  messageInput.value.innerHTML = "";
  inputContent.value = "";
  quoteText.value = ""; // 清空引用

  // 处理待发送文件
  let imagePath = null;
  const currentFile = pendingFile.value;
  const currentPreview = pendingPreviewUrl.value;

  // 清空待发送状态
  pendingFile.value = null;
  pendingPreviewUrl.value = null;

  // 立即添加用户消息到界面末尾（保持对话顺序）
  const userMsg = {
    id: `temp-${Date.now()}`,
    role: "user",
    content: content || "",
    image_path: currentPreview || null, // 临时显示本地预览图
    timestamp: new Date().toISOString(),
  };
  messages.value.push(userMsg);

  // 🔧 立即添加 thinking 占位消息，确保用户发送后立刻看到 AI 思考动画
  const thinkingPlaceholderId = Date.now() + 1;
  const thinkingMsg = {
    id: thinkingPlaceholderId,
    role: "assistant",
    content: "",
    status: "thinking",
  };
  messages.value.push(thinkingMsg);
  console.log(
    "💭 [ChatView] Thinking placeholder added:",
    thinkingPlaceholderId
  );

  // 设置标志位：需要滚动到底部
  shouldScrollToBottom.value = true;

  try {
    // 如果有文件，先上传
    if (currentFile) {
      // 显示上传状态（可选，目前直接用打字状态覆盖）
      imagePath = await chatStore.uploadImage(currentFile);

      if (!imagePath) {
        console.error("❌ 图片上传返回空路径");
        // 移除 thinking 占位消息
        const thinkingIndex = messages.value.findIndex(
          (m) => m.id === thinkingPlaceholderId
        );
        if (thinkingIndex !== -1) {
          messages.value.splice(thinkingIndex, 1);
        }
        // 上传失败处理
        messages.value.push({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "❌ 图片上传失败，请重试。",
          status: "done",
        });
        // 移除刚才添加的用户消息
        const userMsgIndex = messages.value.findIndex(
          (m) => m.id === userMsg.id
        );
        if (userMsgIndex !== -1) {
          messages.value.splice(userMsgIndex, 1);
        }
        return;
      }

      // 保存服务器返回的路径用于发送给后端
      // 但前端显示时继续使用本地预览图（base64），避免图片闪烁或加载失败
      const lastIndex = messages.value.length - 1;
      if (lastIndex >= 0 && messages.value[lastIndex].id === userMsg.id) {
        // 保存服务器路径到消息对象，但不替换显示用的 image_path
        // image_path 保持 base64 以确保显示正常
        messages.value[lastIndex]._serverImagePath = imagePath;
      }
    }

    // 发送到后端（默认走流式）
    // 使用 setTimeout 0 将请求放入下一个宏任务，确保 UI 先渲染用户消息和思考气泡
    // 注意：发送给后端时使用原始 imagePath，不要使用规范化后的路径
    setTimeout(async () => {
      try {
        // 确保发送给后端的是原始路径（服务器返回的路径）
        // 如果 imagePath 是完整 URL，需要提取相对路径
        let pathToSend = imagePath;
        if (imagePath && typeof imagePath === "string") {
          // 如果是完整 URL，提取路径部分
          try {
            const url = new URL(imagePath);
            pathToSend = url.pathname;
          } catch {
            // 不是完整 URL，直接使用
            // 确保路径格式正确（以 / 开头）
            if (!pathToSend.startsWith("/") && !pathToSend.startsWith("http")) {
              pathToSend = "/" + pathToSend;
            }
          }
        }
        if (chatMode.value === "core2") {
          const attachments = currentFile ? [{ name: currentFile.name, type: currentFile.type }] : [];
          await chatStore.sendMessageCore2(content, attachments, router);
        } else {
          await chatStore.sendMessageStreamed(content, pathToSend, router);
        }
      } catch (e) {
        console.error("发送消息失败:", e.message);
        // 移除 thinking 占位消息
        const thinkingIndex = messages.value.findIndex(
          (m) => m.id === thinkingPlaceholderId
        );
        if (thinkingIndex !== -1) {
          messages.value.splice(thinkingIndex, 1);
        }
        messages.value.push({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "❌ 发送失败，请重试。",
          status: "done",
        });
      }
    }, 0);
  } catch (e) {
    console.error("发送消息失败:", e);
    // 移除 thinking 占位消息
    const thinkingIndex = messages.value.findIndex(
      (m) => m.id === thinkingPlaceholderId
    );
    if (thinkingIndex !== -1) {
      messages.value.splice(thinkingIndex, 1);
    }
    messages.value.push({
      id: `error-${Date.now()}`,
      role: "assistant",
      content: "❌ 发送失败，请重试。",
      status: "done",
    });
  }

  // 检测是否需要刷新任务列表
  // 检查用户输入和AI响应
  const lowerContent = (content || "").toLowerCase();
  const needsTaskRefresh = /任务|待办|todo|task/.test(lowerContent);

  // 增加延迟到3秒，确保AI响应和工具执行都已完成
  setTimeout(() => {
    if (needsTaskRefresh) {
      window.dispatchEvent(new CustomEvent("refresh-tasks"));
    }
  }, 3000);
};

const stopGeneration = () => {
  chatStore.stopGeneration();
};

const handleMainButton = () => {
  if (effectiveButtonMode.value === "send") {
    sendMessage();
  } else if (effectiveButtonMode.value === "stop") {
    stopGeneration();
  } else {
    toggleVoiceMode();
  }
};

const handleUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 检查文件类型
  if (file.type.startsWith("image/")) {
    // 图片：添加到待发送列表，显示预览
    pendingFile.value = file;

    // 创建本地预览URL
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingPreviewUrl.value = e.target.result;
    };
    reader.readAsDataURL(file);

    // 聚焦输入框
    nextTick(() => {
      messageInput.value?.focus();
    });
  } else {
    // 处理文档上传 (保持原有逻辑，文档直接上传处理)
    try {
      // 显示加载状态
      chatStore.isTyping = true;

      // 添加用户消息占位
      messages.value.push({
        id: `temp-doc-${Date.now()}`,
        role: "user",
        content: `📄 上传文档：${file.name}`,
        timestamp: new Date().toISOString(),
      });

      // 滚动到底部
      shouldScrollToBottom.value = true;

      const result = await chatStore.uploadDocument(file);

      if (result.success) {
        // 构建总结消息
        let content = `### 📄 文档总结：${file.name}\n\n${result.summary}\n\n#### 💡 关键要点\n`;
        if (Array.isArray(result.key_points)) {
          result.key_points.forEach((p) => (content += `- ${p}\n`));
        }

        content += `\n\n*(处理耗时: ${result.processing_time.toFixed(1)}秒)*`;

        // 添加 AI 回复消息
        // 注意：这里只是前端显示，如果需要持久化到对话历史，
        // 建议后端 upload_document 接口同时也写入 messages 表，
        // 或者前端调用 sendMessage 发送总结内容（但这会再次触发 AI 生成）
        // 目前作为独立功能展示
        messages.value.push({
          id: `doc-summary-${result.document_id}`,
          role: "assistant",
          content: content,
          timestamp: new Date().toISOString(),
          status: "done",
        });

        // 再次滚动
        shouldScrollToBottom.value = true;

        // 关键修复：如果这是新会话，更新路由，确保刷新后不丢失
        if (
          result.session_id &&
          (!route.params.sessionId ||
            route.params.sessionId !== result.session_id)
        ) {
          // 更新 store 状态
          chatStore.currentSessionId = result.session_id;
          // 更新 URL，确保刷新后能加载回话
          // 使用 replace 避免在历史记录中留下空白的新对话页面
          await router.replace(`/chat/${result.session_id}`);
        }
      } else {
        messages.value.push({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `❌ 文档处理失败: ${result.error || "未知错误"}`,
          status: "done",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      messages.value.push({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ 上传失败: ${error.message || "网络错误"}`,
        status: "done",
      });
    } finally {
      chatStore.isTyping = false;
    }
  }
  e.target.value = "";
};

const clearPendingFile = () => {
  pendingFile.value = null;
  pendingPreviewUrl.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const handleDragEnter = (e) => {
  dragCounter.value++;
  isDraggingFile.value = true;
};

const handleDragLeave = (e) => {
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    isDraggingFile.value = false;
    dragCounter.value = 0;
  }
};

const handleDrop = (e) => {
  isDraggingFile.value = false;
  dragCounter.value = 0;
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    // 复用 handleFileChange 的逻辑，但需要构造一个类似 event 的对象
    handleFileChange({ target: { files: [file], value: "dummy" } });
  }
};

const startVisualizer = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (!isRecording.value) return;
      analyser.getByteFrequencyData(dataArray);
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Normalize to 0-1 or similar for scaling
      audioLevel.value = average / 50.0; // Adjust sensitivity
      visualizerFrame = requestAnimationFrame(update);
    };
    update();
  } catch (e) {
    console.error("Visualizer init failed:", e);
  }
};

const stopVisualizer = () => {
  if (visualizerFrame) cancelAnimationFrame(visualizerFrame);
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  audioLevel.value = 0;
};

const handleVoice = () => {
  // 语音输入功能
  console.log("语音输入");
};

// PCM/WAV 录音缓冲
let pcmBuffers = [];
let inputSampleRate = 44100;
let scriptNode = null;

const startPcmRecording = async () => {
  try {
    if (!mediaStream) {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const source = audioContext.createMediaStreamSource(mediaStream);
    inputSampleRate = audioContext.sampleRate || 44100;
    scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
    pcmBuffers = [];
    scriptNode.onaudioprocess = (e) => {
      if (!isRecording.value) return;
      const channelData = e.inputBuffer.getChannelData(0);
      pcmBuffers.push(new Float32Array(channelData));
    };
    source.connect(scriptNode);
    scriptNode.connect(audioContext.destination);
    startVisualizer();
  } catch (err) {
    console.error("启动PCM录音失败:", err);
    isRecording.value = false;
    stopVisualizer();
    // 根据错误类型给出不同提示
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      alert(
        "需要麦克风权限才能使用语音输入。\n\n请点击地址栏旁的锁图标，允许此网站访问麦克风，然后刷新页面。"
      );
    } else if (
      err.name === "NotFoundError" ||
      err.name === "DevicesNotFoundError"
    ) {
      alert("未检测到麦克风设备，请检查设备连接。");
    } else {
      alert("无法访问麦克风，请检查浏览器权限和设备设置。");
    }
    throw err; // 重新抛出错误，让handleVoiceInput捕获
  }
};

const stopPcmRecording = async () => {
  try {
    if (scriptNode) {
      try {
        scriptNode.disconnect();
      } catch (_) {}
      scriptNode.onaudioprocess = null;
      scriptNode = null;
    }
    const length = pcmBuffers.reduce((sum, arr) => sum + arr.length, 0);
    const merged = new Float32Array(length);
    let offset = 0;
    for (const buf of pcmBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }
    const targetRate = 16000;
    const downsampled = downsampleBuffer(merged, inputSampleRate, targetRate);
    const wavBlob = encodeWAV(downsampled, targetRate);
    return wavBlob;
  } catch (err) {
    console.error("停止PCM录音失败:", err);
    return null;
  } finally {
    pcmBuffers = [];
  }
};

function downsampleBuffer(buffer, sampleRate, outSampleRate) {
  if (outSampleRate === sampleRate) return floatTo16BitPCM(buffer);
  const ratio = sampleRate / outSampleRate;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLen);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0,
      count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    const sample = Math.max(-1, Math.min(1, accum / (count || 1)));
    result[offsetResult] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let index = 44;
  for (let i = 0; i < samples.length; i++, index += 2) {
    view.setInt16(index, samples[i], true);
  }
  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

const handleVoiceInput = async () => {
  if (recognition.value) {
    if (isRecording.value) {
      recognition.value.stop();
      isRecording.value = false;
      stopVisualizer();
    } else {
      try {
        recognition.value.start();
        isRecording.value = true;
        startVisualizer();
      } catch (e) {
        console.error("无法启动语音识别:", e);
        isRecording.value = false;
        stopVisualizer();
        if (e.name === "NotAllowedError") {
          alert(
            "需要麦克风权限才能使用语音输入。请在浏览器设置中允许麦克风访问。"
          );
        } else {
          alert("语音输入启动失败，请检查麦克风权限或刷新页面重试。");
        }
      }
    }
    return;
  }
  if (!isRecording.value) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        "当前浏览器不支持麦克风访问。请通过 HTTPS 方式打开或使用支持麦克风权限的浏览器。"
      );
      return;
    }
    try {
      isRecording.value = true;
      await startPcmRecording();
    } catch (e) {
      console.error("启动录音失败:", e);
      isRecording.value = false;
      if (e.name === "NotAllowedError" || e.message?.includes("permission")) {
        alert(
          "需要麦克风权限才能使用语音输入。请在浏览器设置中允许麦克风访问。"
        );
      } else {
        alert("无法启动录音，请检查麦克风是否正常工作。");
      }
    }
  } else {
    isRecording.value = false;
    stopVisualizer();
    const wavBlob = await stopPcmRecording();
    if (!wavBlob) {
      alert("录音数据为空，请重试。");
      return;
    }
    try {
      const res = await api.recognizeVoice(wavBlob, "voice.wav");
      if (res && res.success && res.text) {
        if (messageInput.value) {
          messageInput.value.innerText =
            (messageInput.value.innerText || "") + res.text;
          handleInput();
          messageInput.value.focus();
        }
      } else {
        alert("语音识别失败: " + (res?.message || "无法识别语音内容"));
      }
    } catch (err) {
      console.error("语音识别请求失败:", err);
      alert("语音识别服务异常，请稍后重试。");
    }
  }
};

const toggleVoiceMode = () => {
  const next = !showVoiceMode.value;
  onVoiceModeVisibleChange(next);
};

let totalVoiceSessionDuration = 0;
let hasVoiceSessionEndTag = false;
const onVoiceModeVisibleChange = (val) => {
  showVoiceMode.value = val;
  isVoiceMode.value = !!val;
  if (val) {
    // 进入语音模式，重置结束标签标志
    hasVoiceSessionEndTag = false;
  }
};

// 处理语音消息
const handleVoiceMessage = async (data) => {
  // 移除 isTyping 限制，允许用户在上一条AI回复播放或打字时继续说话
  if (!data.content) return;

  // 添加用户语音消息
  messages.value.push({
    id: `temp-voice-${Date.now()}`,
    role: "user",
    content: data.content,
    messageType: "voice",
    duration: data.duration || 0,
    timestamp: new Date().toISOString(),
  });

  shouldScrollToBottom.value = true;

  try {
    // 发送到后端（语音：即时显示 + voice_call 极简风格）
    await chatStore.sendMessage(data.content, null, null, {
      instant: true,
      responseStyle: "voice_call",
    });
  } catch (error) {
    console.error("发送语音消息失败:", error);
  }
};

// 处理语音音色切换
const handleVoiceChange = (voice) => {
  // 保存到本地存储（保存音色ID，使用时转换为person数字）
  localStorage.setItem("selectedVoice", voice);
};

// 语音会话结束：插入结束标签消息
const handleVoiceSessionEnd = ({ duration }) => {
  try {
    totalVoiceSessionDuration += duration || 0;
    // 移除已有的结束标签（如果有）
    const idx = messages.value.findIndex(
      (m) => m.messageType === "voice-session-end"
    );
    if (idx !== -1) {
      messages.value.splice(idx, 1);
    }
    // 只插入一次
    if (!hasVoiceSessionEndTag) {
      messages.value.push({
        id: `voice-end-${Date.now()}`,
        role: "assistant",
        content: "语音聊天已结束",
        messageType: "voice-session-end",
        duration: totalVoiceSessionDuration,
        timestamp: new Date().toISOString(),
      });
      hasVoiceSessionEndTag = true;
      shouldScrollToBottom.value = true;
    } else {
      // 已有标签则只更新时间
      const tag = messages.value.find(
        (m) => m.messageType === "voice-session-end"
      );
      if (tag) tag.duration = totalVoiceSessionDuration;
    }
  } catch (e) {
    console.error("Insert voice session end tag failed:", e);
  }
};

const canSend = computed(() => {
  return messageInput.value?.innerText?.trim().length > 0;
});

onMounted(() => {
  const homeDraft = consumeHomeDraft();
  if (homeDraft) {
    inputContent.value = homeDraft;
    nextTick(() => applyDraftToEditor(messageInput.value, homeDraft));
  }
  window.addEventListener("xiaole-chat-mode-change", onChatModeChange);
  // 终极超时保护：如果10秒后还在加载,强制停止
  setTimeout(() => {
    if (isLoadingSession.value) {
      if (isDev) console.warn("⚠️ 检测到长时间加载,强制停止加载动画");
      isLoadingSession.value = false;
    }
  }, 10000);

  const onResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };
  window.addEventListener("resize", onResize);
  window.__chat_onResize = onResize;
  // 设置可视高度 CSS 变量，适配移动端键盘
  const applyViewportHeight = () => {
    try {
      const vh = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    } catch (_) {}
  };
  applyViewportHeight();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportHeight);
    window.visualViewport.addEventListener("scroll", applyViewportHeight);
    // 保存引用以便卸载时移除
    window.__chat_applyViewportHeight = applyViewportHeight;
  }

  // 监听输入框 focus/blur，避免移动端键盘遮挡
  const onFocus = () => {
    try {
      chatViewRoot.value?.classList.add("keyboard-open");
      // 聚焦时立即粘底，确保输入可见
      setTimeout(() => stickToBottomImmediate(), 0);
    } catch (_) {}
  };
  const onBlur = () => {
    try {
      chatViewRoot.value?.classList.remove("keyboard-open");
    } catch (_) {}
  };

  if (messageInput.value) {
    messageInput.value.addEventListener("focus", onFocus);
    messageInput.value.addEventListener("blur", onBlur);
  }
  // 保存引用以便卸载时移除
  window.__chat_onFocus = onFocus;
  window.__chat_onBlur = onBlur;

  // 监听即时语音助手回复事件（voice_call模式下 isTyping 为 false）
  const voiceAssistantHandler = (e) => {
    if (!isVoiceMode.value) return;
    const text = e.detail?.text;
    if (text) {
      speakAndResumeMic(text);
    }
  };
  window.addEventListener("voiceAssistantReply", voiceAssistantHandler);
  chatStore.__voiceAssistantHandler = voiceAssistantHandler;
  // 初始化语音识别
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.value = new SpeechRecognition();
    recognition.value.lang = "zh-CN";
    recognition.value.continuous = true;
    recognition.value.interimResults = true;

    let baselineText = "";

    // 语音输入开始时初始化finalAccumulated为当前输入框内容
    const startVoiceInput = () => {
      baselineText = messageInput.value?.innerText || "";
    };

    // 输入框内容变动时同步finalAccumulated，防止手动删除后被还原
    const oldHandleInput = handleInput;
    window.handleInput = function (...args) {
      baselineText = messageInput.value?.innerText || "";
      return oldHandleInput.apply(this, args);
    };
    recognition.value.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (messageInput.value) {
        if (finalTranscript) {
          baselineText += finalTranscript;
          messageInput.value.innerText = baselineText;
          handleInput();
          if (isVoiceMode.value) {
            setTimeout(() => {
              if (isVoiceMode.value && messageInput.value?.innerText.trim()) {
                sendMessage();
                baselineText = messageInput.value.innerText || "";
              }
            }, 800);
          }
        } else if (interimTranscript) {
          messageInput.value.innerText = baselineText + interimTranscript;
          handleInput();
        }
      }
    };

    recognition.value.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== "no-speech") {
        isRecording.value = false;
        stopVisualizer();
      }
    };

    recognition.value.onend = () => {
      // 如果是录音状态（非手动停止），则尝试重新启动
      if (isRecording.value) {
        try {
          recognition.value.start();
        } catch (e) {
          console.error("Restart recognition failed:", e);
          isRecording.value = false;
          stopVisualizer();
        }
      } else {
        stopVisualizer();
      }
    };
    // 监听语音按钮，开始录音时初始化finalAccumulated
    if (typeof handleVoiceInput === "function") {
      const oldHandleVoiceInput = handleVoiceInput;
      window.handleVoiceInput = function (...args) {
        startVoiceInput();
        return oldHandleVoiceInput.apply(this, args);
      };
    }
  }

  // 移除自动滚动，让浏览器保持用户的滚动位置
  currentGreeting.value = selectRandomGreeting();

  if (chatContainer.value) {
    chatContainer.value.addEventListener("click", onChatClick);
    chatContainer.value.addEventListener("scroll", onScroll, { passive: true });

    // 使用 MutationObserver 监听 DOM 变化，自动添加代码块头部
    observer.value = new MutationObserver(() => {
      enhanceRenderedContent();
    });
    observer.value.observe(chatContainer.value, {
      childList: true,
      subtree: true,
    });
  }

  // 初始执行一次
  nextTick(enhanceRenderedContent);

  document.addEventListener("selectionchange", handleSelection);
});

onBeforeUnmount(() => {
  window.removeEventListener("xiaole-chat-mode-change", onChatModeChange);
  // 停止朗读
  stopSpeech();
  stopVisualizer();
  stopAutoStick();

  if (observer.value) {
    observer.value.disconnect();
  }

  if (chatContainer.value) {
    chatContainer.value.removeEventListener("click", onChatClick);
    chatContainer.value.removeEventListener("scroll", onScroll);
  }
  document.removeEventListener("selectionchange", handleSelection);
  // 移除 viewport 监听
  if (window.visualViewport && window.__chat_applyViewportHeight) {
    try {
      window.visualViewport.removeEventListener(
        "resize",
        window.__chat_applyViewportHeight
      );
      window.visualViewport.removeEventListener(
        "scroll",
        window.__chat_applyViewportHeight
      );
      delete window.__chat_applyViewportHeight;
    } catch (_) {}
  }
  // 移除输入框 focus/blur 监听
  if (messageInput.value && window.__chat_onFocus && window.__chat_onBlur) {
    try {
      messageInput.value.removeEventListener("focus", window.__chat_onFocus);
      messageInput.value.removeEventListener("blur", window.__chat_onBlur);
      delete window.__chat_onFocus;
      delete window.__chat_onBlur;
    } catch (_) {}
  }
  if (chatStore.__voiceAssistantHandler) {
    window.removeEventListener(
      "voiceAssistantReply",
      chatStore.__voiceAssistantHandler
    );
    delete chatStore.__voiceAssistantHandler;
  }
  if (window.__chat_onResize) {
    window.removeEventListener("resize", window.__chat_onResize);
    delete window.__chat_onResize;
  }
});

// 语音模式期间产生的 AI 回复不可重新生成
watch(
  messages,
  () => {
    if (!isVoiceMode.value) return;
    const last = messages.value[messages.value.length - 1];
    if (last && last.role === "assistant" && last.noRegen !== true) {
      last.noRegen = true;
    }
  },
  { deep: true }
);

// 解析引用内容
const extractReferences = (content) => {
  if (!content) return { main: "", refs: [] };

  // 匹配 "参考来源：" 或 "References:" 及其后的内容
  // 使用更严格的正则，确保是在行首或双换行后
  const refRegex =
    /(?:^|\n\n)(?:参考来源|References|Sources)[:：]\s*([\s\S]*)$/i;
  const match = content.match(refRegex);

  if (!match) return { main: content, refs: [] };

  const refBlock = match[1];
  const main = content.substring(0, match.index).trim();

  // 提取链接：1. [Title](URL)
  const linkRegex = /(?:^|\n)\s*\d+\.\s*\[(.*?)\]\((.*?)\)/g;
  const refs = [];
  let linkMatch;

  while ((linkMatch = linkRegex.exec(refBlock)) !== null) {
    refs.push({
      title: linkMatch[1],
      href: linkMatch[2],
      body: "", // 文本解析没有摘要
    });
  }

  // 如果没有提取到有效链接，说明可能不是标准的引用块，不截断
  if (refs.length === 0) return { main: content, refs: [] };

  return { main, refs };
};

const getDisplayContent = (message) => {
  // 如果有结构化的 search_results，我们仍然尝试移除文本中的引用部分，避免重复
  // 如果没有 search_results，我们也移除引用部分，因为会渲染成卡片
  const { main } = extractReferences(message.content);
  return main;
};

const getRelatedReadings = (message) => {
  // 优先使用后端返回的结构化数据（包含摘要）
  if (message.search_results && message.search_results.length > 0) {
    return message.search_results;
  }
  // 否则尝试从文本中解析
  const { refs } = extractReferences(message.content);
  return refs;
};

const hasRelatedReadings = (message) => {
  if (message.search_results && message.search_results.length > 0) return true;
  const { refs } = extractReferences(message.content);
  return refs.length > 0;
};

const getDomain = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch (e) {
    return "web";
  }
};

const handleFaviconError = (e) => {
  e.target.style.opacity = "0";
};

const feedbackMessage = async (message, type) => {
  try {
    const id = message?.id;
    if (!id) return;

    // 如果是点赞 (up)
    if (type === "up") {
      // 如果已经是 up，则取消
      if (feedbackState.value.get(id) === "up") {
        feedbackState.value.delete(id);
        // TODO: 发送取消反馈请求
      } else {
        // 如果是 down，先清除 down
        feedbackState.value.set(id, "up");
        await chatStore.submitFeedback({
          message_id: id,
          rating: "up",
        });
      }
    }
    // 如果是点踩 (down)
    else if (type === "down") {
      // 如果已经是 down，则取消
      if (feedbackState.value.get(id) === "down") {
        feedbackState.value.delete(id);
        // TODO: 发送取消反馈请求
      } else {
        // 打开反馈弹窗
        currentFeedbackMessageId.value = id;
        showFeedbackDialog.value = true;
        // 暂时不立即设置状态，等提交后再设置
        // 或者先设置为 down，如果取消弹窗再撤销？
        // 这里选择：先不设置，提交后设置
      }
    }
  } catch (e) {
    console.error("Feedback error:", e);
  }
};
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background: var(--bg-primary);
}
/* 欢迎消息 */
.welcome-message {
  flex-shrink: 0;
  text-align: center;
  z-index: 10;
  animation: fadeInUp 0.5s ease-out;
  margin-top: -10vh; /* 桌面端稍微上移 */
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate(-50%, -45%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.welcome-title {
  font-size: 24px;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}
.welcome-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 会话加载错误提示样式 */
.session-error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  animation: fadeInUp 0.5s ease-out;
  max-width: 500px;
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-medium);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.error-detail {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.6;
  word-break: break-word;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: var(--brand-primary);
  color: white;
}

.error-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.error-button.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-medium);
}

.error-button.secondary:hover {
  background: var(--bg-hover);
}

.chat-view.empty {
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 32px; /* 欢迎语和输入框之间的间距 */
}
.chat-view.empty .chat-container {
  visibility: hidden;
  pointer-events: none;
  position: absolute; /* 完全脱离布局流 */
}
.chat-view.empty .input-container {
  position: static;
  background: transparent;
  border-top: none;
  padding: 0 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
}
.chat-view.empty .input-wrapper {
  max-width: 42rem; /* PC端输入框 */
  width: 90%;
  box-shadow: none;
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium);
}
.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column; /* 改为 column 布局 */
  align-items: center; /* 水平居中 */
  justify-content: flex-start; /* 内容从顶部开始，不要垂直居中 */
  background: var(--bg-primary);
  /* margin-bottom: 100px; Removed to prevent layout jump on focus */
  scroll-behavior: auto; /* 确保初始滚动是瞬间的 */
  min-height: 0; /* 确保 flex 子项可以收缩 */
}

/* 加载状态：仅禁用交互，不隐藏内容 */
.chat-container.is-loading {
  pointer-events: none;
}
/* 移除 opacity 过渡，避免内容闪烁 */
/* 键盘弹出时，减少底部间距以避免过多空白 */
/* .chat-view.keyboard-open .chat-container {
  margin-bottom: 8px;
} */
.chat-inner {
  width: 100%;
  max-width: 42rem;
  padding: 16px 20px;
  padding-bottom: 80px; /* 底部留出输入框空间 */
  position: relative;
}
.message {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  animation: messageSlideIn 0.3s ease-out forwards;
}
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.message.thinking-message {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}
/* PC端最后一条消息添加底部空间，确保工具栏可见 */
.message:last-child {
  padding-bottom: 80px;
}
.message.new-group {
  margin-top: 8px;
}
.message.user {
  align-items: flex-end;
}
.message.assistant {
  align-items: flex-start;
}
.user-bubble {
  background: #2f2f2f;
  color: #ececec;
  border-radius: 16px;
  padding: 11px 15px;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  font-size: 16px;
  max-width: 68%;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  overflow: hidden;
}
/* 用户气泡中的代码块溢出处理 */
.user-bubble :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
}
[data-theme="light"] .user-bubble {
  background: #f3f4f6;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.user-bubble :deep(p) {
  margin: 0 0 0.5em 0;
  line-height: 1.6;
  color: #ececec;
}
[data-theme="light"] .user-bubble :deep(p) {
  color: #1f2937;
}
.user-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

/* 消息折叠样式 */
.md-content.collapsed {
  max-height: 200px;
  overflow: hidden;
  position: relative;
}

.md-content.collapsed::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--bg-primary) 70%,
    var(--bg-primary)
  );
  pointer-events: none;
}

.user-bubble .md-content.collapsed::after {
  background: linear-gradient(to bottom, transparent, #2f2f2f 70%, #2f2f2f);
}

[data-theme="light"] .user-bubble .md-content.collapsed::after {
  background: linear-gradient(to bottom, transparent, #f3f4f6 70%, #f3f4f6);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s ease;
  align-self: center;
}

.expand-btn svg {
  transition: transform 0.2s ease;
}

.expand-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  color: var(--text-primary);
}

.expand-btn.assistant {
  align-self: flex-start;
  margin-left: 0;
}

[data-theme="light"] .expand-btn {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .expand-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.12);
}

/* 语音会话结束标签 */
.voice-session-tag {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 260px;
}
.voice-session-tag .tag-left {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.voice-session-tag .tag-main {
  display: flex;
  flex-direction: column;
}
.voice-session-tag .tag-title {
  font-weight: 600;
  color: var(--text-primary);
}
.voice-session-tag .tag-sub {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 语音消息样式 */
.user-bubble.voice-message {
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.15) 0%,
    rgba(118, 75, 162, 0.15) 100%
  );
  border-left: 3px solid #667eea;
}

.voice-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  opacity: 0.85;
}

.voice-duration {
  font-variant-numeric: tabular-nums;
}
.scroll-to-bottom {
  position: fixed;
  left: calc(50% + 130px);
  transform: translateX(-50%);
  bottom: calc(100px + env(safe-area-inset-bottom));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1200;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.3s ease;
}

/* 浅色主题 hover */
.scroll-to-bottom:hover {
  transform: translateX(-50%) translateY(-4px) scale(1.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 1);
}

.scroll-to-bottom:active {
  transform: translateX(-50%) translateY(-2px) scale(0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* 深色主题 - 黑色半透明圆圈 */
[data-theme="dark"] .scroll-to-bottom {
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .scroll-to-bottom:hover {
  transform: translateX(-50%) translateY(-4px) scale(1.08);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.35);
}

[data-theme="dark"] .scroll-to-bottom:active {
  transform: translateX(-50%) translateY(-2px) scale(0.95);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3);
}

.scroll-icon {
  width: 40px;
  height: 40px;
  position: relative;
  z-index: 1;
  color: inherit;
}
.scroll-icon * {
  stroke: currentColor !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  fill: currentColor !important;
}

/* SVG箭头样式 */
.scroll-to-bottom svg {
  display: block;
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  min-height: 24px !important;
  max-width: 24px !important;
  max-height: 24px !important;
}

.scroll-to-bottom svg path {
  stroke-width: 2 !important;
}

.md-content :deep(ul),
.md-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}
.md-content :deep(ul) {
  list-style-type: disc;
}
.md-content :deep(ol) {
  list-style-type: decimal;
}
.md-content :deep(ul ul) {
  list-style-type: circle;
}
.md-content :deep(ul ul ul) {
  list-style-type: square;
}
.message-content :deep(code),
.md-content :deep(code) {
  background: rgba(175, 184, 193, 0.2);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: ui-monospace, "SF Mono", Monaco, "Cascadia Code", monospace;
  color: var(--text-primary);
  border: 1px solid rgba(175, 184, 193, 0.25);
  font-weight: 500;
}
.message-content :deep(pre code),
.md-content :deep(pre code) {
  border: none;
  font-weight: 400;
}
.message-content :deep(pre),
.md-content :deep(pre) {
  background: #0d1117;
  padding: 0;
  border-radius: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 1em 0;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.message-content :deep(pre code),
.md-content :deep(pre code) {
  background: none;
  padding: 16px 20px;
  color: #e6edf3;
  font-family: ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
    Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.75;
  display: block;
  white-space: pre;
  overflow-x: visible;
  font-weight: 400;
  letter-spacing: 0.02em;
  tab-size: 2;
}
[data-theme="light"] .message-content :deep(pre) {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
}
[data-theme="light"] .message-content :deep(pre code) {
  color: #24292e;
}
.message-image-wrapper {
  margin: 0 0 8px 0;
  position: relative;
  width: 100%;
  /* 确保图片容器可见 */
  min-height: 50px;
}

/* 用户消息的图片 - 显示在气泡外面，上方位置 */
.message.user .message-image-wrapper.user-message-image {
  margin: 0 0 8px 0;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.message.user .message-image-wrapper.user-message-image .message-image {
  max-width: 320px;
  border-radius: 12px;
}

.message-image {
  max-width: 320px;
  max-height: 180px;
  width: auto;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: block;
  cursor: pointer;
  /* 确保图片可见 */
  opacity: 1;
  visibility: visible;
}

.image-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px dashed var(--border-medium);
  color: var(--text-secondary);
  font-size: 14px;
  padding: 12px;
}

.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3) {
  margin: 0.7em 0 0.4em;
  line-height: 1.2;
}
.md-content :deep(h4),
.md-content :deep(h5),
.md-content :deep(h6) {
  margin: 0.6em 0 0.3em;
}
.md-content :deep(a) {
  color: var(--brand-primary);
  text-decoration: none;
}
.md-content :deep(a:hover) {
  text-decoration: underline;
}
.md-content :deep(blockquote) {
  margin: 0.9em 0;
  padding: 8px 12px;
  border-left: 3px solid var(--border-medium);
  background: var(--bg-secondary);
  border-radius: 6px;
}

/* 表格容器 - 支持水平滚动 */
.md-content :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 16px 0;
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.md-content :deep(table) {
  width: 100%;
  min-width: 400px;
  border-collapse: collapse;
  font-size: 14px;
}

.md-content :deep(th) {
  border: 1px solid var(--border-light);
  padding: 10px 14px;
  background: var(--bg-secondary);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.md-content :deep(td) {
  border: 1px solid var(--border-light);
  padding: 10px 14px;
  vertical-align: top;
}

.md-content :deep(tr:nth-child(even)) {
  background: var(--bg-secondary);
}

.md-content :deep(tr:hover) {
  background: var(--bg-hover);
}
.md-content :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

/* 代码块头部 */
.md-content :deep(.code-header),
.message-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.3) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 20px;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
}

.md-content :deep(.code-lang),
.message-content :deep(.code-lang) {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.md-content :deep(.copy-btn),
.message-content :deep(.copy-btn) {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.md-content :deep(.copy-btn svg),
.message-content :deep(.copy-btn svg) {
  width: 14px;
  height: 14px;
  opacity: 0.85;
  transition: transform 0.2s ease;
}

.md-content :deep(.copy-btn:hover),
.message-content :deep(.copy-btn:hover) {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.md-content :deep(.copy-btn:hover svg),
.message-content :deep(.copy-btn:hover svg) {
  transform: scale(1.1);
}

.md-content :deep(.copy-btn.copied),
.message-content :deep(.copy-btn.copied) {
  background: rgba(46, 160, 67, 0.25);
  border-color: rgba(46, 160, 67, 0.4);
  color: #3fb950;
}

.md-content :deep(.copy-btn.copied svg),
.message-content :deep(.copy-btn.copied svg) {
  opacity: 1;
  transform: scale(1.15);
}

/* 代码滚动条优化 */
.md-content :deep(pre code)::-webkit-scrollbar {
  height: 8px;
}

.md-content :deep(pre code)::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.md-content :deep(pre code)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.md-content :deep(pre code)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
.message-toolbar {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 0;
  transition: opacity 0.2s;
  flex-wrap: wrap;
  opacity: 0;
}

/* PC端：鼠标悬停时显示工具栏 */
.chat-view .message:hover .message-toolbar {
  opacity: 1;
}

/* Assistant消息工具栏对齐方式 */
.message.assistant .message-toolbar {
  justify-content: flex-start;
}

/* User消息工具栏对齐方式 */
.message.user .message-toolbar {
  justify-content: flex-end;
}
.toolbar-icon {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: 6px;
  transition: all 0.15s;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.toolbar-icon svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.toolbar-icon:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.toolbar-icon.active {
  background: var(--bg-active);
  color: var(--text-primary);
}

/* 桌面端：仅用户消息的工具栏需要悬停显示，AI消息工具栏始终显示 */
@media (min-width: 481px) {
  .message.user .message-toolbar {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .chat-view .message.user:hover .message-toolbar,
  .chat-view .message.user .message-toolbar:hover {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  /* AI消息工具栏始终显示 */
  .message.assistant .message-toolbar {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.message.user .toolbar-icon {
  color: rgba(255, 255, 255, 0.5);
}
[data-theme="light"] .message.user .toolbar-icon {
  color: var(--text-tertiary);
}
.message.user .toolbar-icon:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}
[data-theme="light"] .message.user .toolbar-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.message.user .toolbar-icon.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
[data-theme="light"] .message.user .toolbar-icon.active {
  background: var(--bg-active);
  color: var(--text-primary);
}
.input-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--bg-primary);
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  border-top: none !important;
  box-shadow: none !important;
  flex-shrink: 0;
}
.input-wrapper {
  max-width: 42rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  background: var(--bg-secondary);
  border: none !important;
  border-radius: 22px;
  padding: 8px 10px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  min-height: 50px;
  position: relative;
}
.input-wrapper:focus-within {
  border-color: var(--text-tertiary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.input-wrapper.drag-over {
  border-color: var(--brand-primary);
  background: var(--bg-tertiary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.input-wrapper.drag-over::after {
  content: "释放以添加文件";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--brand-primary);
  font-weight: 500;
  border-radius: 22px;
  z-index: 10;
  pointer-events: none;
}
[data-theme="dark"] .input-wrapper.drag-over::after {
  background: rgba(30, 30, 30, 0.8);
}
.input-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}
/* 图片预览区域优化 */
.input-preview-area {
  padding: 4px 4px 0 4px;
  display: flex;
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

.preview-card {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-medium);
  background: var(--bg-tertiary);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-close-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 0;
}

.preview-card:hover .preview-close-btn {
  opacity: 1;
}

.preview-close-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.message-editor {
  flex: 1;
  max-height: 200px;
  overflow-y: auto;
  outline: none;
  padding: 9px 4px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.5;
  min-height: 22px;
  border: none;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.message-editor:empty:before {
  content: attr(data-placeholder);
  color: var(--text-tertiary);
  font-size: 15px;
}
.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.icon-btn svg {
  width: 18px;
  height: 18px;
}
.icon-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.icon-btn.active {
  background: var(--brand-primary);
  color: var(--text-inverse);
}
.icon-btn.recording {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}
.voice-mode-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.voice-mode-btn svg {
  width: 28px;
  height: 28px;
}

.voice-mode-btn.send-mode {
  background: #ffffff;
  color: var(--text-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-medium);
}
.voice-mode-btn.send-mode:hover {
  background: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
}

/* 停止模式样式 */
.voice-mode-btn.stop-mode {
  background: var(--error);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.35);
}
.voice-mode-btn.stop-mode:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(255, 0, 0, 0.45);
}

/* 思考动画 - 三个圆点跳动效果 */
.dot {
  display: inline-block !important;
  width: 8px !important;
  height: 8px !important;
  background: #3b82f6 !important;
  border-radius: 50% !important;
  animation: thinkingBounce 1.4s ease-in-out infinite !important;
}

.dot-1 {
  animation-delay: 0s !important;
}

.dot-2 {
  animation-delay: 0.2s !important;
}

.dot-3 {
  animation-delay: 0.4s !important;
}

@keyframes thinkingBounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.typing-indicator span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #3b82f6;
  animation: typingDotBounce 1.2s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDotBounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
  40% {
    transform: translateY(-6px);
    opacity: 0.5;
  }
}

.skeleton-wrapper {
  background: var(--bg-secondary);
  padding: 16px 20px;
  border-radius: var(--radius-xl);
  border-bottom-left-radius: var(--radius-xs);
  min-width: 200px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  visibility: visible !important;
  opacity: 1 !important;
  box-shadow: var(--shadow-sm);
  margin-top: 4px;
  margin-bottom: 80px;
  scroll-margin-bottom: 120px;
  position: relative;
  z-index: 999 !important;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

/* 骨架屏内容区域 */
.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 骨架屏文字行 */
.skeleton-line {
  height: 12px;
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 25%,
    var(--bg-hover) 50%,
    var(--bg-tertiary) 75%
  );
  background-size: 200% 100%;
  border-radius: 6px;
  animation: skeletonShimmer 1.5s ease-in-out infinite;
}

.skeleton-line-long {
  width: 100%;
}

.skeleton-line-medium {
  width: 75%;
}

.skeleton-line-short {
  width: 50%;
}

@keyframes skeletonShimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 思考指示器区域 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}

.thinking-wrapper {
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-radius: var(--radius-xl);
  border-bottom-left-radius: var(--radius-xs);
  min-width: 80px;
  display: flex !important;
  align-items: center;
  gap: 8px;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 40px;
  box-shadow: var(--shadow-sm);
  margin-top: 4px;
  margin-bottom: 80px;
  scroll-margin-bottom: 120px;
  position: relative;
  z-index: 999 !important;
  border: 1px solid var(--border-light);
}

.thinking-animation {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 16px;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  background: var(--text-primary);
  border-radius: 50%;
  animation: thinkingWave 1.2s ease-in-out infinite;
}

.thinking-dot:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes thinkingWave {
  0%,
  60%,
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.thinking-label {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.typing-indicator span {
  background-color: var(--brand-primary);
  width: 6px;
  height: 6px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
@media (max-width: 900px) {
  .scroll-to-bottom {
    width: 56px;
    height: 56px;
    bottom: calc(90px + env(safe-area-inset-bottom));
  }

  .scroll-icon {
    width: 32px;
    height: 32px;
  }
}

.chat-view.keyboard-open .scroll-to-bottom {
  bottom: calc(70px + env(safe-area-inset-bottom));
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: zoom-out;
}
.image-preview {
  max-width: 92vw;
  max-height: 92vh;
  border-radius: 12px;
  box-shadow: 0 15px 60px rgba(0, 0, 0, 0.35);
}
@media (max-width: 900px) {
  .input-wrapper {
    max-width: 98vw;
  }
}

/* 移动端适配优化 - 768px 以下 */
@media (max-width: 768px) {
  .chat-view {
    height: 100%; /* 使用父容器高度 */
    display: flex;
    flex-direction: column;
    overflow: hidden; /* 防止整体滚动 */
  }

  /* 对话容器：确保正确的 flex 布局 */
  .chat-container {
    flex: 1;
    min-height: 0; /* 关键：允许 flex 子项收缩 */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 移动端内容区域的 padding */
  .chat-inner {
    padding-top: 16px;
    padding-bottom: 80px; /* 底部留出输入框空间 */
  }

  /* 移动端最后一条消息不需要额外 padding（已由 chat-inner 处理） */
  .message:last-child {
    padding-bottom: 0;
  }
}

/* 更小屏幕的额外优化 */
@media (max-width: 480px) {
  .chat-view {
    height: 100%; /* 跟随 App 内容区高度（已预留 TopBar） */
  }

  /* 移动端空状态：欢迎语居中偏下，输入框固定底部 */
  .chat-view.empty {
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 0;
  }

  .chat-view.empty .welcome-message {
    position: absolute;
    top: 36%; /* 移动端欢迎语整体上移 */
    left: 50%;
    transform: translate(-50%, -50%);
    margin-top: 0;
    white-space: nowrap; /* 防止换行 */
  }

  .chat-view.empty .chat-container {
    opacity: 0;
    pointer-events: none;
    position: absolute;
  }

  .chat-view.empty .input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 10px calc(10px + env(safe-area-inset-bottom));
    background: var(--bg-primary);
  }

  .user-bubble {
    max-width: 88%;
    font-size: 15px;
    padding: 10px 14px;
  }

  /* 确保移动端用户消息可见且正确对齐 */
  .message.user {
    display: flex !important;
    justify-content: flex-end !important;
    margin-bottom: 12px;
    width: 100%;
    visibility: visible !important;
    opacity: 1 !important;
  }

  .message.user .user-bubble {
    display: block !important;
    word-wrap: break-word;
    overflow-wrap: break-word;
    visibility: visible !important;
    opacity: 1 !important;
    background: #2f2f2f !important;
  }

  [data-theme="light"] .message.user .user-bubble {
    background: #f3f4f6 !important;
    color: #1f2937 !important;
  }

  .message.assistant .md-content {
    font-size: 15px;
  }

  .input-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--bg-primary);
    padding: 8px 10px calc(10px + env(safe-area-inset-bottom));
    border-top: none !important;
    box-shadow: none !important;
  }

  .input-wrapper {
    padding: 6px 8px;
    border-radius: 20px;
  }

  .welcome-title {
    font-size: 18px; /* 移动端字体更小，防止换行 */
  }

  .welcome-icon {
    font-size: 40px;
  }

  /* 移动端始终显示工具栏，避免无法操作 */
  .message .message-toolbar {
    opacity: 1;
    margin-top: 8px;
    gap: 6px;
  }
  /* 最后一条消息的工具栏添加更多底部间距，确保不被输入框遮挡 */
  .message:last-child .message-toolbar {
    margin-bottom: 16px;
    padding-bottom: 4px;
  }

  /* 助手消息的工具栏，不需要额外底部空间 */
  .message.assistant:last-child {
    padding-bottom: 0;
  }

  .message.user .message-toolbar {
    justify-content: flex-end;
  }

  /* 优化代码块在移动端的显示 */
  .md-content :deep(pre) {
    border-radius: 8px;
    margin: 0.8em 0;
  }

  .md-content :deep(pre code) {
    padding: 12px 14px;
    font-size: 13px;
  }

  /* 调整图片最大宽度 */
  .message-image {
    max-width: 100%;
    max-height: 240px;
  }

  /* 移动端隐藏“语音模式”图标态，仅保留发送/停止两种态 */
  .voice-mode-btn:not(.send-mode):not(.stop-mode) {
    display: none;
  }

  /* 移动端滚动按钮调整 */
  .scroll-to-bottom {
    left: 50%;
    width: 48px;
    height: 48px;
    bottom: calc(80px + env(safe-area-inset-bottom));
  }

  .scroll-to-bottom svg {
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    min-height: 22px !important;
  }

  .scroll-to-bottom svg path {
    stroke-width: 2 !important;
  }
}

/* 编辑模式样式 */
.edit-mode-container {
  width: 100%;
  max-width: 68%;
  background: var(--bg-secondary);
  border: 1px solid var(--brand-primary);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-textarea {
  width: 100%;
  min-height: 60px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: inherit;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-edit-action {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-edit-action.cancel {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-edit-action.cancel:hover {
  background: var(--bg-hover);
}

.btn-edit-action.save {
  background: var(--brand-primary);
  color: #fff;
}

.btn-edit-action.save:hover {
  opacity: 0.9;
}

/* 复制成功图标颜色 */
.text-success {
  color: #3fb950;
}

/* 图片预览控制栏 */
.preview-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2001;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.zoom-level {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  min-width: 40px;
  text-align: center;
}

.divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

/* 引用浮动按钮 */
.quote-float-btn {
  position: fixed;
  z-index: 2147483647 !important;
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  padding: 6px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px); /* 增加毛玻璃效果 */
}

.quote-float-btn:hover {
  background: var(--bg-hover);
  transform: translateY(-2px);
}

/* 引用预览条 */
.quote-preview-bar {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  z-index: 10;
  height: 44px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.quote-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.quote-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.quote-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

.close-quote-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-quote-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 反馈弹窗样式 */
.feedback-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.feedback-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium);
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  animation: modalIn 0.2s ease-out;
}

.feedback-modal.large {
  max-width: 500px;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.feedback-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.feedback-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.feedback-tag {
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-tag:hover {
  background: var(--bg-hover);
}

.feedback-tag.selected {
  background: var(--brand-primary-bg, rgba(59, 130, 246, 0.1));
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.feedback-tag.more {
  background: transparent;
  border: 1px dashed var(--border-medium);
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  background: var(--brand-primary);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-submit:hover {
  opacity: 0.9;
}

.feedback-textarea {
  width: 100%;
  height: 120px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-medium);
  border-radius: 8px;
  padding: 12px;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
  outline: none;
}

.feedback-textarea:focus {
  border-color: var(--brand-primary);
}

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-medium);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

/* 相关阅读卡片样式 */
.related-reading {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  animation: fadeIn 0.5s ease-out;
  width: 100%;
  overflow: hidden; /* 防止溢出 */
}

.related-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.related-cards {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  width: 100%;
  /* 隐藏滚动条但保持功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.related-cards::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.related-card {
  flex: 1; /* 均分宽度 */
  min-width: 0; /* 防止内容撑开 */
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 确保图片不溢出圆角 */
}

.related-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-medium);
}

.card-image-area {
  height: 110px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
}

.card-cover-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  opacity: 0.9;
  transition: transform 0.3s ease;
}

.related-card:hover .card-cover-icon {
  transform: scale(1.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  flex: 1;
}

.card-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.favicon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

.domain-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-snippet {
  display: none; /* 隐藏摘要以节省空间 */
}

/* 拖拽遮罩样式 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* 让事件穿透，但 dragover 会拦截 */
}

/* 暗色模式适配 */
:global(.dark) .drag-overlay {
  background: rgba(0, 0, 0, 0.7);
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  border-radius: 16px;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
  border: 2px dashed var(--brand-primary);
  animation: scaleIn 0.2s ease-out;
}

.drag-icon {
  color: var(--brand-primary);
  margin-bottom: 16px;
}

.drag-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.drag-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== 强制移除所有消息之间的横线/边框（覆盖现有样式） ===== */
.chat-inner,
.message,
.message * {
  border-top: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.divider {
  display: none !important;
}

/* 确保 message 内容区域不显示分隔线 */
.message .md-content,
.message .user-bubble,
.message .voice-session-tag,
.quote-preview-bar,
.related-reading,
.related-card,
.preview-card {
  border: none !important;
}

.message + .message {
  border-top: none !important;
  margin-top: 8px;
}

/* 强制确保消息内容区可见且有默认配色，防止被其他样式隐藏 */
.message .md-content {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  color: var(--text-primary) !important;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.message.assistant .md-content {
  color: var(--text-primary) !important;
  width: 100%;
  min-width: 0;
}

.message.assistant {
  max-width: 100%;
  width: 100%;
  min-width: 0;
}

/* 全局样式：思考动画关键帧，供内联样式引用 */
@keyframes thinkingBounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.feedback-textarea {
  width: 100%;
  height: 120px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-medium);
  border-radius: 8px;
  padding: 12px;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
  outline: none;
}

.feedback-textarea:focus {
  border-color: var(--brand-primary);
}

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border-medium);
  color: var(--text-secondary);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

/* 相关阅读卡片样式 */
.related-reading {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  animation: fadeIn 0.5s ease-out;
  width: 100%;
  overflow: hidden; /* 防止溢出 */
}

.related-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.related-cards {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  width: 100%;
  /* 隐藏滚动条但保持功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.related-cards::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

.related-card {
  flex: 1; /* 均分宽度 */
  min-width: 0; /* 防止内容撑开 */
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 确保图片不溢出圆角 */
}

.related-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-medium);
}

.card-image-area {
  height: 110px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
}

.card-cover-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: contain;
  opacity: 0.9;
  transition: transform 0.3s ease;
}

.related-card:hover .card-cover-icon {
  transform: scale(1.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  flex: 1;
}

.card-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.favicon {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

.domain-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-snippet {
  display: none; /* 隐藏摘要以节省空间 */
}

/* 拖拽遮罩样式 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* 让事件穿透，但 dragover 会拦截 */
}

/* 暗色模式适配 */
:global(.dark) .drag-overlay {
  background: rgba(0, 0, 0, 0.7);
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  border-radius: 16px;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
  border: 2px dashed var(--brand-primary);
  animation: scaleIn 0.2s ease-out;
}

.drag-icon {
  color: var(--brand-primary);
  margin-bottom: 16px;
}

.drag-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.drag-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== 强制移除所有消息之间的横线/边框（覆盖现有样式） ===== */
.chat-inner,
.message,
.message * {
  border-top: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.divider {
  display: none !important;
}

/* 确保 message 内容区域不显示分隔线 */
.message .md-content,
.message .user-bubble,
.message .voice-session-tag,
.quote-preview-bar,
.related-reading,
.related-card,
.preview-card {
  border: none !important;
}

.message + .message {
  border-top: none !important;
  margin-top: 8px;
}

/* 强制确保消息内容区可见且有默认配色，防止被其他样式隐藏 */
.message .md-content {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  color: var(--text-primary) !important;
}

.message.assistant .md-content {
  color: var(--text-primary) !important;
}

/* ========== 下拉刷新样式 ========== */
.pull-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-out;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
}

.pull-refresh-indicator.visible {
  opacity: 1;
  transition: none;
}

.pull-refresh-indicator.loading {
  opacity: 1;
  transition: transform 0.2s ease-out;
}

.pull-refresh-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.pull-refresh-icon {
  color: var(--text-secondary);
  transition: transform 0.1s linear;
}

.pull-refresh-indicator.ready .pull-refresh-icon {
  color: var(--button-gradient-start);
}

.pull-refresh-text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.pull-refresh-indicator.ready .pull-refresh-text {
  color: var(--button-gradient-start);
}

.pull-refresh-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--button-gradient-start);
  border-radius: 50%;
  animation: pullRefreshSpin 0.8s linear infinite;
}

@keyframes pullRefreshSpin {
  to {
    transform: rotate(360deg);
  }
}

/* 深色主题 */
[data-theme="dark"] .pull-refresh-content {
  background: #3a3a3a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
/* ========== 下拉刷新样式结束 ========== */

/* 全局样式：思考动画关键帧，供内联样式引用 */
@keyframes thinkingBounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}
</style>
