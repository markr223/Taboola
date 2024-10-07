export default class Adwidget {
    constructor(appKey, appName, recCount = 6, apptype='desktop', sourcePlacement='any') {
        this.widgetContainer = document.getElementById('widget-container');
        const url = 'https://api.taboola.com/1.2/json/feed/recommendations.get?'
        const sourceType = 'text';
        const sourceId = 'https://www.microsoft.com/en-us/p/microsoft-sudoku/9wzdncrfhv60';
        const sourceUrl = 'https://www.microsoft.com/en-us/p/microsoft-sudoku/9wzdncrfhv60g';
        const userSession = 'init';
        this.apiUrl = `${url}&app.type=${apptype}&app.apikey=${appKey}&app.name=${appName}&rec.count=${recCount}&source.type=${sourceType}&source.id=${sourceId}&source.url=${sourceUrl}&source.placement=${sourcePlacement}&user.session=${userSession}`;
        this.loading = false;

        /* using Observer to detect when the last recommendation is in view
        https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API 
        threshold - 
        1 means that the callback will be called when the last recommendation is fully in view
        0 means that the callback will be called when the last recommendation is partially in view
        */
        this.observer = new IntersectionObserver(this.handleIntersect.bind(this), { threshold: 1 });
    }

    // Fetch recommendations from the API and return the list of recommendations
    fetchRecommendations(retryCount = 2) {
        return fetch(this.apiUrl)
        .then(response => response.json())
        .then(data => data.list)
        .catch(error => {
            if (retryCount > 0) {
                console.warn(`Call failed trying again: ${retryCount}`);
                return this.fetchRecommendations(retryCount - 1);
            } else {
                console.error('Error fetching recommendations:', error);
                return [];
            }
        });
    }
    // create a recommendation video element to be displayed as part of the widget
    createRecommendationVideoElement(element, recommendation) {
        const video = document.createElement('video');
            video.src = recommendation.thumbnail[0].url;
            video.controls = false;
            video.style.width = '100%';
            video.preload = 'metadata';
            video.autoplay = true;
            video.muted = true;
            element.appendChild(video);
    }
    // create a recommendation image element to be displayed as part of the widget
    createRecommendationImageElement(element, recommendation) {
        const imgSrc = recommendation.thumbnail[0].url;
        const fallbackSrc = './assets/images.png'; // Fallback image in case the image is not available
        const img = document.createElement('img');
        img.src = imgSrc;
        img.addEventListener('error', function() { // Handle image loading error when the image is not available
            this.src = fallbackSrc;
            this.alt = recommendation.branding || recommendation.name || 'image not available';
        });
        element.appendChild(img); // Add the image to the recommendation element
    }
    // Create a recommendation element to be displayed
    createRecommendationElement(recommendation) {
        const element = document.createElement('div');
        element.className = 'recommendation';
        this.createRecommendationImageElement(element, recommendation);

        const contentDiv = document.createElement('div'); // Create the content of the recommendation
        contentDiv.className = 'recommendation-content';
        const titleDiv = document.createElement('div');
        titleDiv.className = 'recommendation-title';
        titleDiv.textContent = recommendation.name;
        contentDiv.appendChild(titleDiv);
        if (recommendation.branding) {
            const sourceDiv = document.createElement('div');
            sourceDiv.className = 'recommendation-source';
            sourceDiv.textContent = recommendation.branding;
            contentDiv.appendChild(sourceDiv);
        }
        if (recommendation.origin === 'sponsored') {
            const sponsoredContainer = document.createElement('div');
            sponsoredContainer.className = 'sponsored-container';
            const sponsoredSpan = document.createElement('span');
            sponsoredSpan.className = 'sponsored-tag';
            sponsoredSpan.textContent = 'sponsored';
            sponsoredContainer.appendChild(sponsoredSpan);
            contentDiv.appendChild(sponsoredContainer);
        }
        const adTag = document.createElement('div');
        adTag.className = 'ad-tag-container';
        const adTagSpan = document.createElement('span');
        adTagSpan.className = 'ad-tag';
        adTagSpan.textContent = 'Ad';
        adTag.appendChild(adTagSpan);
        contentDiv.appendChild(adTag);


        element.appendChild(contentDiv); // Add the content to the recommendation element
        element.addEventListener('click', () => this.handleClick(recommendation));
        return element;
    }
    // Handle click on a recommendation
    handleClick(recommendation) {
        if (recommendation.origin === 'sponsored') {
            window.open(recommendation.url, '_blank');
        } else {
            window.location.href = recommendation.url;
        }
    }
    // render the widget by loading more recommendations (using async to be able to use await in the render method)
    async render() {
        await this.loadMore();
    }
    // Handle the intersection of the last recommendation with the viewport
    handleIntersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.loading) {
                this.observer.unobserve(entry.target);
                this.loadMore().then(() => {}).catch(error => {
                    console.error('Error loading more recommendations:', error);
                });
            }
        });
    }
    loadMore() {
        // if loading is already in progress, return
        if (this.loading) return;
        // else change the loading state and fetch more recommendations
        this.loading = true;

        const loadingIndicator = document.querySelector('.loading-indicator');
        loadingIndicator.style.display = 'block';
        // fetch more Recommendations 
        return this.fetchRecommendations()
        .then(newRecommendations => {
            newRecommendations.forEach(recommendation => {
                const element = this.createRecommendationElement(recommendation);
                this.widgetContainer.insertBefore(element, loadingIndicator);
            });
            // hide the loading indicator and change the loading state
            loadingIndicator.style.display = 'none';
            this.loading = false;
            const lastElement = this.widgetContainer.children[this.widgetContainer.children.length - 2]; 
            // -2 Beacuse we want to get the last recommendtion and not the loading indicator
            
            if (lastElement) {
                this.observer.observe(lastElement);
            }
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            loadingIndicator.style.display = 'none';
            this.loading = false;
        });
    }
}
