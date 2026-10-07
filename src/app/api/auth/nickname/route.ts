import { NextResponse, type NextRequest } from "next/server";
import { checkNickname, isNicknameTaken } from "@/lib/users";

// 가입 화면의 닉네임 중복 확인: /api/auth/nickname?value=홍길동
export async function GET(request: NextRequest) {
  const nickname = (request.nextUrl.searchParams.get("value") ?? "").trim();
  const invalid = checkNickname(nickname);
  if (invalid) return NextResponse.json({ available: false, error: invalid });
  if (await isNicknameTaken(nickname))
    return NextResponse.json({
      available: false,
      error: "이미 사용 중인 닉네임입니다.",
    });
  return NextResponse.json({ available: true });
}
