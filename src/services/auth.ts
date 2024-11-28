import axios from 'axios';
import { BASE_URL } from '../configuration/constants';

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const OAUTH_GENERATION_ENDPOINT = '/oauth2/token';
const OAUTH_VALIDATION_ENDPOINT = '/oauth2/validate';

const generateOAuthToken = async (): Promise<string> => {
    try {
        const response = await axios.post<{
            access_token: string;
        }>(`${BASE_URL}${OAUTH_GENERATION_ENDPOINT}`, null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials',
                scope: 'chat:read chat:edit',
            },
        });

        return response.data.access_token;
    } catch {
        throw new Error('Error fetching OAuth token');
    }
};

const validateOAuthToken = async (token: string): Promise<boolean> => {
    try {
        await axios.get(`${BASE_URL}${OAUTH_VALIDATION_ENDPOINT}`, {
            headers: {
                Authorization: `OAuth ${token}`,
            },
        });

        return true;
    } catch { return false; }
};

const getOAuthToken = async () => {
    // TODO storage the token until it becomes invalid
    const token = await generateOAuthToken();

    // Now is unnecesary
    const isNotExpired = await validateOAuthToken(token);

    if (isNotExpired) return token;

    return await generateOAuthToken();
};

export default getOAuthToken;
