import { ApiPlayerStats, PlayerStats } from '@/interfaces/player'
import { NextApiRequest, NextApiResponse } from 'next'
import { formatRoundsData } from '@/utils/formatRoundsData'
import { roundNames } from '@/constants'
import { mockApiData } from '@/constants/mock'
import { removeBlacklistedPlayers } from '@/utils/removeBlacklistedPlayers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
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

      const { RoundTimes, PlayerName } = saveData
      const playerStats: Partial<PlayerStats> = {}

      playerStats['battleTag'] = {
        name: PlayerName?.split('#')[0] || '',
        tag: PlayerName || '',
      }

      roundNames.forEach((round) => {
        playerStats[`round${round}`] = formatRoundsData(RoundTimes, round)
      })

      return playerStats
    })

    res.status(200).json(formattedData)
  } catch (error) {
    console.error('Error fetching scoreboard data:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}
