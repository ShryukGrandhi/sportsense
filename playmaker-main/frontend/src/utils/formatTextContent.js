export function formatChatText(text) {
  if (!text) return "";

  try {
    return text
      // Add bold to team names and headings
      .replace(/^[-–]\s*Top Players:/gim, "### 🏈 **Top Players**")
      .replace(/^[-–]\s*Final Score:/gim, "### 📊 **Final Score**")
      .replace(/^[-–]\s*Game Flow:/gim, "### 🔁 **Game Flow**")
      .replace(/^[-–]\s*Key Stats:/gim, "### 📈 **Key Stats**")
      // Bold common team names (extend as needed)
      .replace(/\b(Dolphins|Jets)\b/g, "**$1**")
      // Ensure spacing between sections
      .replace(/\.\s*[-–]\s*/g, ".\n\n- ")
      .replace(/:\s*-/g, ":\n- ")
      // Add paragraph spacing
      .replace(/\n(?!\n)/g, "\n\n")
      .trim();
  } catch {
    return String(text);
  }
}

