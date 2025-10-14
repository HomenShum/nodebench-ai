import { test, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MessageBubble } from '../FastAgentPanel.MessageBubble';
import type { Message } from '../types';

function renderBubble(partial?: Partial<Message>, isStreaming = true) {
  const message: Message = {
    id: 'm1',
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    ...partial,
  } as Message;

  render(
    <MessageBubble
      message={message}
      isStreaming={isStreaming}
      liveThinking={[]}
      liveToolCalls={[]}
      liveSources={[]}
    />
  );
}

test('renders LiveThinking container while streaming even with no live data', () => {
  renderBubble();
  const live = document.querySelector('.message-live-data');
  expect(live).not.toBeNull();
});

