type GetLearningAnalyticsResponse struct {
	ActiveLearners int `json:"active_learners"`
	Completions    int `json:"completions"`
}

func (c *Client) GetLearningAnalytics(ctx context.Context, dateStr string) (*GetLearningAnalyticsResponse, error) {
	req := &wsRequest{
		WSFunction: "local_temanbelajar_get_learning_analytics",
		Args: map[string]interface{}{
			"date": dateStr,
		},
	}

	var res GetLearningAnalyticsResponse
	if err := c.doRequest(ctx, req, &res); err != nil {
		return nil, err
	}

	return &res, nil
}
