const vscode = require('vscode');

class ApiClient {
    constructor() {
        this.config = vscode.workspace.getConfiguration('ecmTimeTracker');
    }

    /**
     * Get current API configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
        return {
            endpoint: this.config.get('apiEndpoint', 'https://taskhub.loc'),
            apiKey: this.config.get('apiKey', ''),
            authMethod: this.config.get('authMethod', 'apiKey'),
            username: this.config.get('basicAuthUsername', ''),
            password: this.config.get('basicAuthPassword', '')
        };
    }

    /**
     * Get authentication headers based on configured method
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        const config = this.getConfig();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.authMethod === 'apiKey' && config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
        } else if (config.authMethod === 'basic' && config.username && config.password) {
            const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        }

        return headers;
    }

    /**
     * Make API request
     * @param {string} endpoint - API endpoint (e.g., '/projects')
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
        const config = this.getConfig();
        const baseEndpoint = config.endpoint.replace(/\/+$/, ''); // Remove trailing slashes
        const url = `${baseEndpoint}/api/v1${endpoint}`;
        
        console.log(`[TimeTracker] API Request: ${url}`);

        const fetchOptions = {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const https = require('https');
            const http = require('http');

            return await new Promise((resolve, reject) => {
                const urlObj = new URL(url);
                const protocol = urlObj.protocol === 'https:' ? https : http;

                const req = protocol.request(url, {
                    method: fetchOptions.method || 'GET',
                    headers: fetchOptions.headers
                }, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        console.log(`[TimeTracker] API Response Status: ${res.statusCode}`);
                        try {
                            const isJson = res.headers['content-type'] && res.headers['content-type'].includes('application/json');
                            if (!isJson) {
                                throw new Error(`Server returned non-JSON response (${res.headers['content-type']}). Check URL or API Key.`);
                            }
                            
                            const jsonData = JSON.parse(data);
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                resolve(jsonData);
                            } else {
                                reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || data}`));
                            }
                        } catch (error) {
                            const snippet = data.length > 100 ? data.substring(0, 100) + '...' : data;
                            reject(new Error(`API Error (HTTP ${res.statusCode}): ${error.message}. Response: ${snippet}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error(`Request failed: ${error.message}`));
                });

                if (fetchOptions.body) {
                    req.write(fetchOptions.body);
                }

                req.end();
            });
        } catch (error) {
            vscode.window.showErrorMessage(`API Request Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all projects
     * @returns {Promise<Array>} Array of projects
     */
    async getProjects() {
        try {
            const response = await this.request('/projects');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            return [];
        }
    }

    /**
     * Get tasks for a specific project
     * @param {number} projectId - Project ID
     * @returns {Promise<Array>} Array of tasks
     */
    async getProjectTasks(projectId) {
        try {
            const response = await this.request(`/projects/${projectId}/tasks`);
            return response.success ? response.data.tasks : [];
        } catch (error) {
            console.error(`Failed to fetch tasks for project ${projectId}:`, error);
            return [];
        }
    }

    /**
     * Get all tasks
     * @returns {Promise<Array>} Array of all tasks
     */
    async getAllTasks() {
        try {
            const response = await this.request('/tasks');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch all tasks:', error);
            return [];
        }
    }

    /**
     * Get all stages (statuses)
     * @returns {Promise<Array>} Array of stages
     */
    async getStages() {
        try {
            const response = await this.request('/stages');
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Failed to fetch stages:', error);
            return [];
        }
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        try {
            const config = this.getConfig();
            const baseEndpoint = config.endpoint.replace(/\/+$/, '');
            const url = `${baseEndpoint}/api/v1/projects`;
            
            const response = await this.request('/projects');
            if (response && response.success) {
                return true;
            }
            throw new Error('API returned success: false');
        } catch (error) {
            console.error('Test connection failed:', error);
            throw error; // Rethrow to show message in UI
        }
    }
}

module.exports = ApiClient;
