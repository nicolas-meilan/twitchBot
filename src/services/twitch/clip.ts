import axios from 'axios';
import logger from '../../utils/logger';
import {
  BASE_CLIP_OFFSET,
  BASE_CLIP_TIME,
  BASE_URL,
} from '../../configuration/constants';

const ACCOUNT_TRACK_ID = process.env.ACCOUNT_TRACK_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

const getStreamInformation = async (authToken: string) => {
  logger.info('Obtaining stream info time ...');

  try {
    const response = await axios.get<{
      data: {
        title: string;
        started_at: string;
        game_id: string;
        viewer_count: string;
        tags_id: string[];
      }[];
    }>(`${BASE_URL}/helix/streams?user_id=${ACCOUNT_TRACK_ID}`, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.data.data.length) throw new Error('Error obtaining stream info time');

    return response.data.data[0];
  } catch (error){
    logger.error('Error obtaining stream info time');
    throw error;
  }
};

type Clip = {
  id: string;
  url: string;
  embed_url: string;
};

export const getLastClipLink = async (
  accessToken: string,
  onAccessTokenExpired?: () => Promise<Clip | null>,
) => {
  try {
    logger.info('Obtaining last clip ...');
    const response = await axios.get<{
      data: Clip[];
    }>(`${BASE_URL}/helix/clips`, {
      params: {
        broadcaster_id: ACCOUNT_TRACK_ID,
        first: 1,
      },
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.data.data.length) throw new Error('No clip available');;

    logger.info('Last clip obtained');
    return response.data.data[0];
  } catch (error) {
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;
    logger.error('Error obtaining last clip');
    return null;
  }
};

export const createClip = async (
  accessToken: string,
  startOffset: number = BASE_CLIP_OFFSET,
  duration: number = BASE_CLIP_TIME,
  onAccessTokenExpired?: () => Promise<Clip | null>,
) => {
  try {
    const streamInfo = await getStreamInformation(accessToken);

    const currentTime = Math.floor(Date.now() / 1000);
    const streamStartTime = new Date(streamInfo.started_at).getTime() / 1000;
    const calculatedStartTime = currentTime - streamStartTime - startOffset;
    const startTime = calculatedStartTime > 0 ? calculatedStartTime : streamStartTime;

    const clipTitle = `${streamInfo.title} | ${streamInfo?.viewer_count || 0} viewers`;
    const clipDescription = streamInfo.tags_id?.join(', ') || '';

    logger.info('Generating clip ...');
    const response = await axios.post<{
      data: Clip[];
    }>(`${BASE_URL}/helix/clips`, {
      broadcaster_id: ACCOUNT_TRACK_ID,
      start_time: startTime,
      duration: duration,
      title: clipTitle,
      description: clipDescription,
    }, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    logger.info('Clip generated');
    return response.data.data[0];
  } catch (error){
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;
    logger.error('Error generating clip');
    throw new Error('Error generating clip');
  }
};
