import Loader from '@/components/atoms/loader'
import { StyledTd } from '../../styled'

export default function LoaderTable() {
  return (
    <tbody>
      {[...Array(5)].map((_, rowIndex) => (
        <tr key={rowIndex}>
          {[...Array(10)].map((_, cellIndex) => (
            <StyledTd key={cellIndex}>
              <br />
              <Loader height={20} />
            </StyledTd>
          ))}
        </tr>
      ))}
    </tbody>
  )
}
