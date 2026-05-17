import { MODELS_SEED } from './ai-models.seed';

describe('AI model seed catalog', () => {
  it('includes MiniMax 2.7 as an explicit chat model for Peaks validation', () => {
    const minimaxModel = MODELS_SEED.find((model) => model.providerCode === 'minimax' && model.modelId === 'MiniMax-M2.7');

    expect(minimaxModel).toMatchObject({
      providerCode: 'minimax',
      name: 'MiniMax 2.7',
      modelId: 'MiniMax-M2.7',
      modelType: 'chat',
      capabilities: expect.arrayContaining(['chat', 'coding']),
    });
  });
});
