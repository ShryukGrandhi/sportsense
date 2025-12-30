import * as cheerio from 'cheerio';

interface NewsItem {
    headline: string;
    link: string;
    source: string;
    league: string;
}

export class WebScraperService {
    /**
     * Scrapes latest headlines from Google News RSS (reliable integration)
     */
    async getLatestNews(league: 'NFL' | 'NBA'): Promise<NewsItem[]> {
        try {
            // Use Google News RSS for reliable structured data
            const query = league === 'NFL' ? 'NFL' : 'NBA';
            const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

            console.log(`Fetching RSS from ${url}...`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch RSS: ${response.status}`);
                return [];
            }

            const xml = await response.text();
            const $ = cheerio.load(xml, { xmlMode: true });
            const news: NewsItem[] = [];

            $('item').each((i, el) => {
                if (news.length >= 5) return;

                const title = $(el).find('title').text();
                const link = $(el).find('link').text();
                const source = $(el).find('source').text() || 'News';

                if (title && link) {
                    news.push({
                        headline: title,
                        link,
                        source,
                        league
                    });
                }
            });

            console.log(`Found ${news.length} news items via RSS`);
            return news;

        } catch (error) {
            console.error('Scraping error:', error);
            return [];
        }
    }

    /**
     * Search specifically for a query
     */
    async searchNews(query: string): Promise<NewsItem[]> {
        // Determine league from query
        const league = query.toLowerCase().includes('nfl') || query.toLowerCase().includes('football') ? 'NFL' : 'NBA';

        // Get latest news
        const allNews = await this.getLatestNews(league);

        // Simple filter
        const terms = query.toLowerCase().split(' ').filter(t => t.length > 3);
        if (terms.length === 0) return allNews;

        return allNews.filter(item =>
            terms.some(term => item.headline.toLowerCase().includes(term))
        );
    }
}

export const scraper = new WebScraperService();
