import { calculateSaveDeathRatio } from '@/utils/calculateSaveDeathRatio'
import { ApiPlayerStats, PlayerStats } from '@/interfaces/player'
import { NextApiRequest, NextApiResponse } from 'next'
import { formatRoundsData } from '@/utils/formatRoundsData'
import { calculateTotals } from '@/utils/calculateTotals'
import { findTopFive } from '@/utils/findTopFive'
import { roundNames } from '@/constants'
import { mockApiData } from '@/constants/mock'
import { calculateWinRate } from '@/utils/calculateWinRate'
import {
  calculateCompletedChallenges,
  calculateCompletedChallengesLegacy,
} from '@/utils/calculateCompletedChallenges'
import { removeBlacklistedPlayers } from '@/utils/removeBlacklistedPlayers'

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.API_KEY

  try {
    if (!apiKey) {
      throw new Error()
    }

    let data = []

    if (process.env.NODE_ENV === 'development') {
      data = mockApiData
    } else {
      const response = await fetch(`${apiKey}players`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      data = await response.json()
      data = removeBlacklistedPlayers(data)
    }

    const formattedData = data.map((elem: ApiPlayerStats) => {
      const saveData = JSON.parse(elem['Save Data'])

      const {
        GameStats,
        RoundTimes,
        PlayerName,
        GameAwards,
        GameAwardsSorted,
      } = saveData
      const playerStats: Partial<PlayerStats> = {}

      if (GameAwardsSorted) {
        playerStats.completedChallenges =
          calculateCompletedChallenges(GameAwardsSorted)
      } else {
        playerStats.completedChallenges =
          calculateCompletedChallengesLegacy(GameAwards)
      }

      playerStats.saves = GameStats.Saves
      playerStats.highestWinStreak = GameStats.HighestWinStreak

      if (GameAwardsSorted) {
        playerStats.saveStreak = {
          highestSaveStreak: GameStats.HighestSaveStreak,
          redLightning: !!GameAwardsSorted.Trails.RedLightning,
          patrioticTendrils: !!GameAwardsSorted.Wings.PatrioticTendrils,
        }
      } else {
        playerStats.saveStreak = {
          highestSaveStreak: GameStats.HighestSaveStreak,
          redLightning: !!GameAwards.RedLightning,
          patrioticTendrils: !!GameAwards.PatrioticTendrils,
        }
      }

      playerStats['battleTag'] = {
        name: PlayerName?.split('#')[0] || '',
        tag: PlayerName || '',
      }

      playerStats['saveDeathRatio'] = calculateSaveDeathRatio(
        GameStats.Saves,
        GameStats.Deaths,
      )

      playerStats['gamesPlayed'] = calculateTotals(
        GameStats.NormalGames,
        GameStats.HardGames,
        GameStats.ImpossibleGames,
      )

      playerStats['wins'] = calculateTotals(
        GameStats.NormalWins,
        GameStats.HardWins,
        GameStats.ImpossibleWins,
      )

      playerStats['winRate'] = calculateWinRate(
        playerStats.wins.total,
        playerStats.gamesPlayed.total,
      )

      roundNames.forEach((round) => {
        playerStats[`round${round}`] = formatRoundsData(RoundTimes, round)
      })

      return playerStats as PlayerStats
    })

    const stats = {
      scoreboard: [
        ...formattedData
          .sort((a, b) => {
            return (
              b.completedChallenges.general[0] -
              a.completedChallenges.general[0]
            )
          })
          .slice(0, 5),
      ],
      leaderboard: {
        stats: [
          {
            category: 'Win Streak',
            data: findTopFive(formattedData, 'highestWinStreak'),
            key: 'highestWinStreak',
          },
          {
            category: 'Saves',
            data: findTopFive(formattedData, 'saves'),
            key: 'saves',
          },
          {
            category: 'Games Played',
            data: findTopFive(formattedData, 'gamesPlayed'),
            key: 'gamesPlayed',
          },
          {
            category: 'Wins',
            data: findTopFive(formattedData, 'wins'),
            key: 'wins',
          },
          {
            category: 'Save/Death Ratio',
            data: findTopFive(formattedData, 'saveDeathRatio'),
            key: 'saveDeathRatio',
          },
        ],
        times: [
          {
            category: 'Round One',
            data: findTopFive(formattedData, 'roundOne'),
            key: 'roundOne',
          },
          {
            category: 'Round Two',
            data: findTopFive(formattedData, 'roundTwo'),
            key: 'roundTwo',
          },
          {
            category: 'Round Three',
            data: findTopFive(formattedData, 'roundThree'),
            key: 'roundThree',
          },
          {
            category: 'Round Four',
            data: findTopFive(formattedData, 'roundFour'),
            key: 'roundFour',
          },
          {
            category: 'Round Five',
            data: findTopFive(formattedData, 'roundFive'),
            key: 'roundFive',
          },
        ],
      },
    }

    res.status(200).json(stats)
  } catch (error) {
    console.error('Error fetching scoreboard data:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}
