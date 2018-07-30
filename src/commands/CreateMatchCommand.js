// @flow
import type { MongoId } from 'mongoose';
import Match, { type MatchType } from '../models/MatchModel';
import User from '../models/UserModel';
import Series from '../models/SeriesModel';
import NotEnoughPlayersError from '../utils/NotEnoughPlayersError';
import UserNotFoundError from '../utils/UserNotFoundError';

export class SeriesNotFoundError extends RangeError {
  constructor(seriesId: MongoId) {
    super(`Cannot find series: "${seriesId}"`);
  }
}

export class PlayersNotInSeriesError extends RangeError {
  constructor(seriesId: MongoId, userIds: Array<MongoId>) {
    super(`Some users "${userIds.join('", "')}" are not in series "${seriesId}"`);
  }
}

export default class CreateMatchCommand {
  matchData: MatchType;

  constructor(matchData: MatchType) {
    // must have at least 1 player
    if (!matchData.players.length) throw new NotEnoughPlayersError();

    // can add more players later (e.g. players decline, matchmake is async)
    this.matchData = matchData;
  }

  async execute(): Promise<Match> {
    const { matchData } = this;
    const { players, seriesId } = matchData;

    const series = await Series.findById(seriesId);
    if (!series) throw new SeriesNotFoundError(seriesId);

    const userIds = players.map(({ userId }) => userId);
    if (!series.hasPlayers(userIds)) {
      throw new PlayersNotInSeriesError(seriesId, userIds);
    }

    // should create match? pending players can't see cards
    return Match.create(matchData);
  }
}
