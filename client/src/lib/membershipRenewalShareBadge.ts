const BADGE_WIDTH = 1200;
const BADGE_HEIGHT = 630;

export function membershipRenewalShareBadgeFileName() {
  return "AASW-Membership-Renewed-Badge.png";
}

export async function createMembershipRenewalShareBadgeFile() {
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_WIDTH;
  canvas.height = BADGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Social badge could not be created.");

  context.fillStyle = "#fffaf0";
  context.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);
  context.fillStyle = "#2f6b52";
  context.fillRect(0, 0, BADGE_WIDTH, 126);
  context.fillStyle = "#d4820a";
  context.fillRect(0, 126, 18, BADGE_HEIGHT - 126);

  context.strokeStyle = "rgba(47,107,82,.18)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(1080, 170, 230, 0, Math.PI * 2);
  context.arc(1080, 170, 150, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#fffaf0";
  context.font = "700 28px sans-serif";
  context.letterSpacing = "5px";
  context.fillText("AASW FOUNDATION", 76, 72);
  context.font = "700 16px sans-serif";
  context.fillText("MEMBERSHIP COMMUNITY", 76, 100);

  context.fillStyle = "#d4820a";
  context.beginPath();
  context.arc(92, 206, 12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#2f6b52";
  context.font = "700 20px sans-serif";
  context.letterSpacing = "3px";
  context.fillText("CONTINUING THE JOURNEY", 120, 213);
  context.fillStyle = "#291d1d";
  context.font = "700 78px Georgia, serif";
  context.letterSpacing = "0px";
  context.fillText("Membership", 76, 320);
  context.fillText("renewed.", 76, 400);
  context.fillStyle = "#2f6b52";
  context.font = "italic 78px Georgia, serif";
  context.fillText("With purpose.", 76, 480);
  context.fillStyle = "#5b4c47";
  context.font = "600 24px sans-serif";
  context.fillText("Practical support. Lasting agency.", 76, 548);
  context.fillStyle = "#d4820a";
  context.fillRect(76, 576, 230, 8);

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Social badge could not be saved.")), "image/png"));
  return new File([blob], membershipRenewalShareBadgeFileName(), { type: "image/png" });
}
