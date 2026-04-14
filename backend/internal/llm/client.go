package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	openai "github.com/sashabaranov/go-openai"

	"github.com/yourname/ai-sre/backend/internal/config"
)

// LLMResponse is the JSON schema the model is instructed to return.
type LLMResponse struct {
	Explanation       string `json:"explanation"`
	Command           string `json:"command"`
	RequiresExecution bool   `json:"requires_execution"`
}

// Client wraps the OpenAI API and maintains per-session conversation history.
type Client struct {
	oai          *openai.Client
	model        string
	systemPrompt string

	mu       sync.Mutex
	sessions map[string][]openai.ChatCompletionMessage
}

func NewClient(cfg config.OpenAIConfig, systemPrompt string) *Client {
	clientCfg := openai.DefaultConfig(cfg.APIKey)
	clientCfg.BaseURL = cfg.Endpoint
	return &Client{
		oai:          openai.NewClientWithConfig(clientCfg),
		model:        cfg.Model,
		systemPrompt: systemPrompt,
		sessions:     make(map[string][]openai.ChatCompletionMessage),
	}
}

// Ask sends message to the model within the given session and returns the
// parsed response. Session history is accumulated for multi-turn context.
func (c *Client) Ask(ctx context.Context, sessionID, message string) (LLMResponse, error) {
	c.mu.Lock()
	history := make([]openai.ChatCompletionMessage, len(c.sessions[sessionID]))
	copy(history, c.sessions[sessionID])
	history = append(history, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: message,
	})
	c.mu.Unlock()

	messages := append(
		[]openai.ChatCompletionMessage{{
			Role:    openai.ChatMessageRoleSystem,
			Content: c.systemPrompt,
		}},
		history...,
	)

	resp, err := c.oai.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:    c.model,
		Messages: messages,
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	})
	if err != nil {
		return LLMResponse{}, fmt.Errorf("openai: %w", err)
	}

	raw := resp.Choices[0].Message.Content
	var result LLMResponse
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return LLMResponse{}, fmt.Errorf("parse llm response: %w", err)
	}

	c.mu.Lock()
	c.sessions[sessionID] = append(history, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: raw,
	})
	c.mu.Unlock()

	return result, nil
}
