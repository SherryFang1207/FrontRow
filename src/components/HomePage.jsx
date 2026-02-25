import HeroSection from './HeroSection'
import MarqueeTicker from './MarqueeTicker'
import LiveDealsSection from './LiveDealsSection'
import TrendingSection from './TrendingSection'
import FeaturedSection from './FeaturedSection'

export default function HomePage({ onGetTickets, onTabChange }) {
  return (
    <div>
      <HeroSection onTabChange={onTabChange} />
      <MarqueeTicker />
      <LiveDealsSection onGetTickets={onGetTickets} />
      <TrendingSection onGetTickets={onGetTickets} />
      <FeaturedSection onGetTickets={onGetTickets} />
    </div>
  )
}
