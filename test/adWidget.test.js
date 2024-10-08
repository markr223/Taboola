import Adwidget from '../adWidget';

describe('Adwidget', () => {
  let widget;
  let mockIntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="widget-container">
        <div class="loading-indicator" style="display: none;"></div>
      </div>
    `;
    mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
    window.IntersectionObserver = mockIntersectionObserver;
    widget = new Adwidget();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test constructor
  test('constructor initializes widget correctly', () => {
    expect(widget.widgetContainer).toBeDefined();
    expect(widget.loading).toBeFalsy();
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  // Test handleClick
  test('handleClick opens new tab for sponsored content', () => {
    const recommendation = { origin: 'sponsored', url: 'http://example.com' };
    window.open = jest.fn();
    widget.handleClick(recommendation);
    expect(window.open).toHaveBeenCalledWith('http://example.com', '_blank');
  });

  test('handleClick changes location for non-sponsored content', () => {
    const recommendation = { origin: 'organic', url: 'http://example.com' };
    delete window.location;
    window.location = { href: '' };
    widget.handleClick(recommendation);
    expect(window.location.href).toBe('http://example.com');
  });

  // Test loadMore
  test('loadMore fetches and displays new recommendations', async () => {
    const mockRecommendations = [
      { name: 'Rec1', branding: 'Brand1', thumbnail: [{ url: 'http://example.com/1.jpg' }], origin: 'organic' },
      { name: 'Rec2', branding: 'Brand2', thumbnail: [{ url: 'http://example.com/2.jpg' }], origin: 'sponsored' }
    ];
    widget.fetchRecommendations = jest.fn().mockResolvedValue(mockRecommendations);
    widget.createRecommendationElement = jest.fn().mockImplementation(() => document.createElement('div'));

    await widget.loadMore();

    expect(widget.fetchRecommendations).toHaveBeenCalled();
    expect(widget.createRecommendationElement).toHaveBeenCalledTimes(2);
    expect(widget.loading).toBeFalsy();
    expect(document.querySelector('.loading-indicator').style.display).toBe('none');
  });

  // Test handleIntersect
  test('handleIntersect calls loadMore when last element is intersecting', () => {
    // Mock the loadMore method
    widget.loadMore = jest.fn().mockResolvedValue();
    // Set loading to false
    widget.loading = false;
    // Create a mock entry
    const mockEntry = { 
      isIntersecting: true,
      target: document.createElement('div')
    };
    widget.handleIntersect([mockEntry]);
    // Check if loadMore was called
    expect(widget.loadMore).toHaveBeenCalled();
    // Check if unobserve was called on the entry's target
    expect(widget.observer.unobserve).toHaveBeenCalledWith(mockEntry.target);
  });

  // Test error handling in fetchRecommendations
  test('fetchRecommendations retries on failure', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce('API is down')
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ list: ['recommendation1'] })
      });

    const recommendations = await widget.fetchRecommendations();
    expect(recommendations).toEqual(['recommendation1']);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});