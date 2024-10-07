// adWidget.test.js

import Adwidget from '../adWidget';

describe('Adwidget', () => {
  let widget;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="widget-container">
        <div class="loading-indicator" style="display: none;"></div>
      </div>
    `;
    widget = new Adwidget();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
 // test fetchRecommendations
  test('fetchRecommendations should return list of recommendations', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ list: ['recommendation1', 'recommendation2'] }),
      })
    );

    const recommendations = await widget.fetchRecommendations();
    expect(recommendations).toEqual(['recommendation1', 'recommendation2']);
  });

  test('fetchRecommendations should return empty array when fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject('API is down'));

    const recommendations = await widget.fetchRecommendations();
    expect(recommendations).toEqual([]);
  });

  // test creating recommendation element
  test('createRecommendationElement should create a recommendation element', () => {
    const recommendation = {
      name: 'Test Recommendation',
      branding: 'Test Brand',
      thumbnail: [{ url: 'http://example.com/test.jpg' }],
      origin: 'organic',
      url: 'http://example.com',
    };

    const element = widget.createRecommendationElement(recommendation);

    expect(element.querySelector('.recommendation-title').textContent).toBe('Test Recommendation');
    expect(element.querySelector('img').src).toBe('http://example.com/test.jpg');
    expect(element.querySelector('.recommendation-source').textContent).toBe('Test Brand');
  });
});
