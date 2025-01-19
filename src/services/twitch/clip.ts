import axios from 'axios';
import logger from '../../utils/logger';
import { BASE_URL } from '../../configuration/constants';
import { delay } from '../../utils/system';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

export type Clip = {
  id: string;
  url: string;
  duration: string;
  embed_url: string;
  created_at: string;
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
        broadcaster_id: BROADCAST_ACCOUNT_ID,
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

export const getClips = async (
  accessToken: string,
  thisWeek: boolean = false,
  onAccessTokenExpired?: () => Promise<Clip[] | null>,
): Promise<Clip[]> => {
  try {
    const now = new Date();
    const week = new Date();
    week.setDate(now.getDate() - 7);

    logger.info('Obtaining clips from current date ...');
    const response = await axios.get<{
      data: Clip[];
      pagination: { cursor?: string };
    }>(`${BASE_URL}/helix/clips`, {
      params: {
        broadcaster_id: BROADCAST_ACCOUNT_ID,
        first: 100,
        ...(thisWeek ? {
          started_at: week.toISOString(),
          ended_at: now.toISOString(),
        }: {}),
      },
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.data.data.length) throw new Error('No clips available');

    logger.info('Clips obtained successfully');
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error?.response?.status === 401) {
      return (await onAccessTokenExpired?.()) || [];
    }
    logger.error('Error obtaining clips');
    throw error;
  }
};

export const getLatestClips = async (
  accessToken: string,
  minClipsLength: number = 10,
) => {
  const weeklyClips = await getClips(accessToken, true);
  const extraClips = weeklyClips.length < minClipsLength
    ? await getClips(accessToken)
    : [];

  return [...weeklyClips, ...extraClips].sort((itemA, itemB) => (
    new Date(itemB.created_at).getTime() - new Date(itemA.created_at).getTime()
  ));
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
    }>(`${BASE_URL}/helix/clips?broadcaster_id=${BROADCAST_ACCOUNT_ID}&has_delay=${withDelay}`, null, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': CLIENT_ID,
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
  } catch (error) {
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;
    logger.error('Error generating clip');
    throw new Error('Error generating clip');
  }
};
