export default class Adwidget {
    constructor() {
        this.widgetContainer = document.getElementById('widget-container');
        const url = 'https://api.taboola.com/1.2/json/feed/recommendations.get?'
        const appKey = '143ca6bf153893c690249736df6a383615bb9e92';
        const appName = 'msn-casualgames-sudoku-us';
        const apptype = 'desktop';
        const recCount = 6;
        const sourceType = 'text';
        const sourceId = 'https://www.microsoft.com/en-us/p/microsoft-sudoku/9wzdncrfhv60';
        const sourceUrl = 'https://www.microsoft.com/en-us/p/microsoft-sudoku/9wzdncrfhv60g';
        const sourcePlacement = 'Any';
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
                retryCount--;
                return this.fetchRecommendations(retryCount - 1);
            } else {
                console.error('Error fetching recommendations:', error);
                return [];
            }
        });
    }

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
    // Create a recommendation element to be displayed as part of the widget
    createRecommendationElement(recommendation) {
        const element = document.createElement('div');
        element.className = 'recommendation';
        this.createRecommendationImageElement(element, recommendation);

        const contentDiv = document.createElement('div'); // Create the content of the recommendation
        contentDiv.className = 'recommendation-content';
        contentDiv.innerHTML = `
            <div class="recommendation-title">${recommendation.name}</div>
            ${recommendation.branding ? `<div class="recommendation-source">${recommendation.branding}</div>` : ''}
            ${recommendation.origin === 'sponsored' ? '<span class="sponsored-tag">sponsored</span>' : ''}
        `;

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
