import { CharacterCard } from "./CharacterCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const trendingUp = [
  { code: 1, name: "나딘", imageUrl: "/characters/placeholder.png", rateChange: 3.2 },
  { code: 2, name: "재키", imageUrl: "/characters/placeholder.png", rateChange: 2.8 },
  { code: 3, name: "레나", imageUrl: "/characters/placeholder.png", rateChange: 2.1 },
  { code: 4, name: "아이솔", imageUrl: "/characters/placeholder.png", rateChange: 1.7 },
]

const trendingDown = [
  { code: 5, name: "한", imageUrl: "/characters/placeholder.png", rateChange: -2.9 },
  { code: 6, name: "피오라", imageUrl: "/characters/placeholder.png", rateChange: -2.4 },
  { code: 7, name: "루크", imageUrl: "/characters/placeholder.png", rateChange: -1.8 },
  { code: 8, name: "비앙카", imageUrl: "/characters/placeholder.png", rateChange: -1.3 },
]

export function TrendingSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-lg">🔥</span>
            <span className="text-[var(--color-accent-gold)]">떡상 캐릭터</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {trendingUp.map((char) => (
              <CharacterCard key={char.code} {...char} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-lg">📉</span>
            <span className="text-[var(--color-danger)]">떡락 캐릭터</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {trendingDown.map((char) => (
              <CharacterCard key={char.code} {...char} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
