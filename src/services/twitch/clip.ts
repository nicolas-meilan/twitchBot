import axios from 'axios';
import logger from '../../utils/logger';
import { BASE_URL } from '../../configuration/constants';
import { delay } from '../../utils/system';

const ACCOUNT_TRACK_ID = process.env.ACCOUNT_TRACK_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

type Clip = {
  id: string;
  url: string;
  duration: string;
  embed_url: string;
  edit_url?: string;
};

export const getClipInformation = async (
  accessToken: string,
  clipId?: string,
  onAccessTokenExpired?: () => Promise<Clip | null>,
) => {
  try {
    logger.info('Obtaining clip info...');
    const response = await axios.get<{
      data: Clip[];
    }>(`${BASE_URL}/helix/clips`, {
      params: clipId ? {
        id: clipId,
      } : {
        broadcaster_id: ACCOUNT_TRACK_ID,
        first: 1,
      },
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.data.data.length) throw new Error('No clip available');;

    logger.info('Clip info obtained');
    return response.data.data[0];
  } catch (error) {
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;
    logger.error('Error obtaining clip info');
    return null;
  }
};

const CLIP_CREATION_TIME = 15000;
export const createClip = async (
  accessToken: string,
  withDelay: boolean = false,
  onAccessTokenExpired?: () => Promise<Clip | null>,
) => {
  try {
    logger.info('Generating clip ...');
    const response = await axios.post<{
      data: { id: string, edit_url: string }[];
    }>(`${BASE_URL}/helix/clips`, {
      broadcaster_id: ACCOUNT_TRACK_ID,
      has_delay: !!withDelay,
    }, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    logger.info('Clip generated');

    const { id, edit_url } = response?.data?.data?.[0] || {};

    if (!id) return null;

    await delay(CLIP_CREATION_TIME);

    const clipData = await getClipInformation(accessToken, id, onAccessTokenExpired);

    return {
      id,
      edit_url,
      ...(clipData || {}),
    } as Clip;
  } catch (error){
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;
    logger.error('Error generating clip');
    throw new Error('Error generating clip');
  }
};
