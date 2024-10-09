import Adwidget from '../adWidget';

describe('Adwidget', () => {
  let widget;
  let mockIntersectionObserver;

  beforeEach(() => {
    // Set up the DOM for each test
    document.body.innerHTML = `
      <div id="widget-container">
        <div class="loading-indicator" style="display: none;"></div>
      </div>
    `;
    // Mock IntersectionObserver
    mockIntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
    window.IntersectionObserver = mockIntersectionObserver;
    
    // Create a new Adwidget instance for each test
    widget = new Adwidget('testKey', 'testApp', 6, 'desktop', 'any');
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
    const recommendation = { origin: 'sponsored', url: 'http://taboolaad.com' };
    window.open = jest.fn();
    widget.handleClick(recommendation);
    expect(window.open).toHaveBeenCalledWith('http://taboolaad.com', '_blank');
  });

  test('handleClick changes location for organic content', () => {
    const recommendation = { origin: 'organic', url: 'http://taboolaad.com' };
    delete window.location; // we need to mock the window.location object
    window.location = { href: '' }; // mocking the window.location object :)
    widget.handleClick(recommendation);
    expect(window.location.href).toBe('http://taboolaad.com');
  });

  // Test loadMore
  test('loadMore fetches and displays new recommendations', async () => {
    const mockRecommendations = [
      { name: 'BMW BEST CAR', branding: 'BMW', thumbnail: [{ url: 'http://taboolaad.com/BMW.jpg' }], origin: 'organic' },
      { name: 'AUDI IS THE BEST', branding: 'AUDI', thumbnail: [{ url: 'http://taboolaad.com/AUDI.jpg' }], origin: 'sponsored' }
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
    widget.loadMore = jest.fn().mockResolvedValue();
    widget.loading = false;
    const mockEntry = { 
      isIntersecting: true,
      target: document.createElement('div')
    };
    widget.handleIntersect([mockEntry]);
    expect(widget.loadMore).toHaveBeenCalled();
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

  // Test generateApiUrl method
  test('generateApiUrl constructs URL correctly', () => {
    // Call the method with a specific recCount
    const url = widget.generateApiUrl(10);
    
    // Check if the URL contains all required parameters
    expect(url).toContain('app.type=desktop');
    expect(url).toContain('app.apikey=testKey');
    expect(url).toContain('app.name=testApp');
    expect(url).toContain('rec.count=10');
    expect(url).toContain('source.placement=any');
    // Add more assertions for other parameters
  });

  // Test createRecommendationVideoElement method
  test('createRecommendationVideoElement creates video element correctly', () => {
    const parentElement = document.createElement('div');
    const recommendation = { thumbnail: [{ url: 'http://taboolaad.com/video.mp4' }] };
    
    widget.createRecommendationVideoElement(parentElement, recommendation);
    
    const video = parentElement.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.src).toBe('http://taboolaad.com/video.mp4');
    expect(video.controls).toBeFalsy();
    expect(video.style.width).toBe('100%');
    expect(video.preload).toBe('metadata');
    expect(video.autoplay).toBeTruthy();
    expect(video.muted).toBeTruthy();
  });

  // Test createRecommendationImageElement method
  test('createRecommendationImageElement creates image element and handles errors', () => {
    const parentElement = document.createElement('div');
    const recommendation = { 
      thumbnail: [{ url: 'http://taboolaad.com/adImage.jpg' }],
      branding: 'Test Brand',
      name: 'Test Name'
    };
    
    widget.createRecommendationImageElement(parentElement, recommendation);
    
    const img = parentElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toBe('http://taboolaad.com/adImage.jpg');

    // Simulate image load error
    img.dispatchEvent(new Event('error'));
    expect(img.src).toContain('images.png');
    expect(img.alt).toBe('Test Brand');
  });

  // Test render method
  test('render calls loadMore', () => {
    // Mock the loadMore method
    widget.loadMore = jest.fn();
    
    widget.render();
    
    expect(widget.loadMore).toHaveBeenCalled();
  });

  // Test error handling in loadMore
  test('loadMore handles errors correctly', async () => {
    widget.fetchRecommendations = jest.fn().mockRejectedValue(new Error('API Error')); // Mock the fetchRecommendations method to throw an error
    console.error = jest.fn(); // Mock console.error to check if it's called without throwing an error
    
    await widget.loadMore(); // Call the loadMore method with failure case(fetchRecommendations is mocked to failed)
    
    expect(console.error).toHaveBeenCalledWith('Error fetching recommendations:', expect.any(Error));
    expect(widget.loading).toBeFalsy();
    expect(document.querySelector('.loading-indicator').style.display).toBe('none');
  });

  // Test creation of sponsored and ad tags
  test('createRecommendationElement adds sponsored and ad tags correctly', () => {
    const sponsoredRecommendation = {
      name: 'Mark Rabinovich - Sponsor',
      branding: 'Mark Rabinovich LTD',
      thumbnail: [{ url: 'http://taboolaad.com/img.jpg' }],
      origin: 'sponsored'
    };
    
    const element = widget.createRecommendationElement(sponsoredRecommendation);
    
    expect(element.querySelector('.sponsored-tag')).toBeTruthy();
    expect(element.querySelector('.ad-tag')).toBeTruthy();
  });

  // Test with different constructor parameters
  test('Adwidget initializes correctly with different parameters', () => {
    const customWidget = new Adwidget('customKey', 'customApp', 10, 'mobile', 'specific');
    
    expect(customWidget.appKey).toBe('customKey');
    expect(customWidget.appName).toBe('customApp');
    expect(customWidget.recCount).toBe(10);
    expect(customWidget.apptype).toBe('mobile');
    expect(customWidget.sourcePlacement).toBe('specific');
  });
});