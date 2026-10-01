(() => {
  // KJV (public domain). One verse per day, rotating by local calendar day.
  const VERSES = [
    ["The Lord is my shepherd; I shall not want.", "Psalm 23:1"],
    ["Be still, and know that I am God.", "Psalm 46:10"],
    ["Trust in the Lord with all thine heart; and lean not unto thine own understanding.", "Proverbs 3:5"],
    ["I can do all things through Christ which strengtheneth me.", "Philippians 4:13"],
    ["For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", "John 3:16"],
    ["The Lord is my light and my salvation; whom shall I fear?", "Psalm 27:1"],
    ["Fear thou not; for I am with thee: be not dismayed; for I am thy God.", "Isaiah 41:10"],
    ["Come unto me, all ye that labour and are heavy laden, and I will give you rest.", "Matthew 11:28"],
    ["Thy word is a lamp unto my feet, and a light unto my path.", "Psalm 119:105"],
    ["And we know that all things work together for good to them that love God.", "Romans 8:28"],
    ["Be strong and of a good courage; be not afraid, neither be thou dismayed.", "Joshua 1:9"],
    ["The Lord is nigh unto all them that call upon him, to all that call upon him in truth.", "Psalm 145:18"],
    ["Love suffereth long, and is kind; love envieth not.", "1 Corinthians 13:4"],
    ["Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", "Matthew 5:16"],
    ["Peace I leave with you, my peace I give unto you.", "John 14:27"],
    ["Seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", "Matthew 6:33"],
    ["They that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.", "Isaiah 40:31"],
    ["Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", "Philippians 4:6"],
    ["Not forsaking the assembling of ourselves together, as the manner of some is.", "Hebrews 10:25"],
    ["Behold, how good and how pleasant it is for brethren to dwell together in unity!", "Psalm 133:1"],
    ["Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.", "Matthew 7:7"],
    ["The Lord bless thee, and keep thee: the Lord make his face shine upon thee.", "Numbers 6:24-25"],
    ["Enter into his gates with thanksgiving, and into his courts with praise.", "Psalm 100:4"],
    ["Where two or three are gathered together in my name, there am I in the midst of them.", "Matthew 18:20"],
    ["Be ye kind one to another, tenderhearted, forgiving one another.", "Ephesians 4:32"],
    ["For we walk by faith, not by sight.", "2 Corinthians 5:7"],
    ["The Lord is good, a strong hold in the day of trouble; and he knoweth them that trust in him.", "Nahum 1:7"],
    ["Cast thy burden upon the Lord, and he shall sustain thee.", "Psalm 55:22"],
    ["Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.", "Matthew 28:19"],
    ["This is the day which the Lord hath made; we will rejoice and be glad in it.", "Psalm 118:24"],
    ["Let us not be weary in well doing: for in due season we shall reap, if we faint not.", "Galatians 6:9"]
  ];

  function dayIndex(date) {
    const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    return dayNumber % VERSES.length;
  }

  function render() {
    const mount = document.querySelector("[data-daily-scripture]");
    if (!mount) return;
    const now = new Date();
    const [text, ref] = VERSES[dayIndex(now)];
    const date = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    mount.innerHTML = "";
    const label = document.createElement("div");
    label.className = "daily-scripture-label";
    label.textContent = "Scripture of the Day · " + date;
    const quote = document.createElement("blockquote");
    quote.textContent = "“" + text + "”";
    const cite = document.createElement("cite");
    cite.textContent = "— " + ref + " (KJV)";
    mount.append(label, quote, cite);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
