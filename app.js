const $ = id => document.getElementById(id);
const BOOKS = [
["Genesis","Gen"],["Exodus","Exod"],["Leviticus","Lev"],["Numbers","Num"],["Deuteronomy","Deut"],["Joshua","Josh"],["Judges","Judg"],["Ruth","Ruth"],["1 Samuel","1Sam"],["2 Samuel","2Sam"],["1 Kings","1Kgs"],["2 Kings","2Kgs"],["1 Chronicles","1Chr"],["2 Chronicles","2Chr"],["Ezra","Ezra"],["Nehemiah","Neh"],["Esther","Esth"],["Job","Job"],["Psalms","Ps"],["Proverbs","Prov"],["Ecclesiastes","Eccl"],["Song of Solomon","Song"],["Isaiah","Isa"],["Jeremiah","Jer"],["Lamentations","Lam"],["Ezekiel","Ezek"],["Daniel","Dan"],["Hosea","Hos"],["Joel","Joel"],["Amos","Amos"],["Obadiah","Obad"],["Jonah","Jonah"],["Micah","Mic"],["Nahum","Nah"],["Habakkuk","Hab"],["Zephaniah","Zeph"],["Haggai","Hag"],["Zechariah","Zech"],["Malachi","Mal"],["Matthew","Matt"],["Mark","Mark"],["Luke","Luke"],["John","John"],["Acts","Acts"],["Romans","Rom"],["1 Corinthians","1Cor"],["2 Corinthians","2Cor"],["Galatians","Gal"],["Ephesians","Eph"],["Philippians","Phil"],["Colossians","Col"],["1 Thessalonians","1Thess"],["2 Thessalonians","2Thess"],["1 Timothy","1Tim"],["2 Timothy","2Tim"],["Titus","Titus"],["Philemon","Phlm"],["Hebrews","Heb"],["James","Jas"],["1 Peter","1Pet"],["2 Peter","2Pet"],["1 John","1John"],["2 John","2John"],["3 John","3John"],["Jude","Jude"],["Revelation","Rev"]
];
const DATA_URL = "https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/kjv/books/";
let bible = new Map(), currentBook = "Genesis", currentChapter = 1, currentVerse = null;
let bookmarks = JSON.parse(localStorage.getItem("voiceBibleBookmarks") || "[]");
let allVerses = [];
const normal = s => String(s||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function setStatus(s){$("status").textContent=s}
async function loadBible(){
  setStatus("Loading all 66 books of the King James Bible…");
  try{
    let done=0;
    await Promise.all(BOOKS.map(async ([name,osis])=>{
      const response=await fetch(DATA_URL+osis+".json");
      if(!response.ok) throw new Error("Could not load "+name);
      const data=await response.json(); bible.set(name,data); done++;
      setStatus("Loading Bible… "+done+" of 66 books");
    }));
    allVerses=[];
    for(const [name] of BOOKS){
      const data=bible.get(name);
      (data.chapters||[]).forEach((chapter,ci)=>(chapter.verses||[]).forEach((v,vi)=>{
        allVerses.push({book:name,chapter:ci+1,verse:vi+1,text:v.text||v});
      }));
    }
    $("bookSelect").innerHTML=BOOKS.map(([n])=>'<option value="'+n+'">'+n+'</option>').join("");
    $("bookSelect").value=currentBook;
    renderChapter(); renderBookmarks(); setStatus("Bible loaded — all 66 books are ready.");
  }catch(e){console.error(e);setStatus("The Bible could not load. Please check your internet connection and refresh the page.");}
}
function chapterCount(book){return (bible.get(book)?.chapters||[]).length}
function renderChapter(){
 const data=bible.get(currentBook); if(!data)return;
 const chapters=data.chapters||[]; currentChapter=Math.min(Math.max(1,currentChapter),chapters.length||1);
 $("chapterSelect").innerHTML=chapters.map((_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join("");
 $("chapterSelect").value=currentChapter; $("bookSelect").value=currentBook;
 $("reference").textContent=currentBook+" "+currentChapter;
 const verses=chapters[currentChapter-1]?.verses||[];
 $("chapterText").innerHTML="";
 verses.forEach((v,i)=>{
  const p=document.createElement("p");p.className="verse-line";
  const num=document.createElement("sup");num.textContent=i+1;
  const span=document.createElement("span");span.textContent=v.text||v;
  p.append(num,span);
  p.addEventListener("click",()=>{document.querySelectorAll(".verse-line.selected").forEach(x=>x.classList.remove("selected"));p.classList.add("selected");currentVerse={reference:currentBook+" "+currentChapter+":"+(i+1),text:v.text||v};});
  $("chapterText").append(p);
 });
 $("prevBtn").disabled=currentBook==="Genesis"&&currentChapter===1;
 $("nextBtn").disabled=currentBook==="Revelation"&&currentChapter===chapterCount(currentBook);
}
function moveChapter(delta){
 let index=BOOKS.findIndex(x=>x[0]===currentBook),next=currentChapter+delta;
 if(next<1&&index>0){currentBook=BOOKS[index-1][0];currentChapter=chapterCount(currentBook);}
 else if(next>chapterCount(currentBook)&&index<BOOKS.length-1){currentBook=BOOKS[index+1][0];currentChapter=1;}
 else currentChapter=next;
 renderChapter();
}
function findReference(q){
 const cleaned=q.replace(/^(open|read|show|find|go to)\s+/i,"").trim();
 const match=cleaned.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/i);
 if(!match)return null;
 const book=BOOKS.find(([n])=>normal(n)===normal(match[1]))||BOOKS.find(([n])=>normal(n).startsWith(normal(match[1])));
 if(!book)return null;
 return {book:book[0],chapter:Number(match[2]),verse:match[3]?Number(match[3]):null,end:match[4]?Number(match[4]):null};
}
function showSearchResults(items,title){
 const wrap=$("results");wrap.innerHTML="";
 if(!items.length){wrap.textContent="No matching verses found. Try a Bible reference or a different word.";return;}
 const heading=document.createElement("h3");heading.textContent=title+" · "+items.length+" results";wrap.append(heading);
 items.slice(0,25).forEach(item=>{
  const b=document.createElement("button");b.className="result-item";
  const strong=document.createElement("strong");strong.textContent=item.book+" "+item.chapter+":"+item.verse;
  const text=document.createElement("span");text.textContent=item.text;
  b.append(strong,text);b.onclick=()=>{currentBook=item.book;currentChapter=item.chapter;renderChapter();currentVerse={reference:strong.textContent,text:item.text};$("reference").textContent=currentVerse.reference;document.querySelectorAll(".verse-line").forEach((p,i)=>{if(i+1===item.verse)p.classList.add("selected")});$("chapterText").scrollIntoView({behavior:"smooth",block:"start"});};
  wrap.append(b);
 });
}
function keywordSearch(q){
 const terms=normal(q).split(" ").filter(w=>w.length>2);
 if(!terms.length)return [];
 const scored=[];
 for(const v of allVerses){const t=normal(v.text);let score=0;for(const word of terms)if(t.includes(word))score++;
  if(score)scored.push({...v,score});
 }
 return scored.sort((a,b)=>b.score-a.score).slice(0,25);
}
function search(q){
 q=q.trim();if(!q)return;
 const ref=findReference(q);
 if(ref){
  if(!bible.has(ref.book)||ref.chapter<1||ref.chapter>chapterCount(ref.book)){setStatus("That chapter could not be found.");return;}
  currentBook=ref.book;currentChapter=ref.chapter;renderChapter();
  if(ref.verse){const verse=allVerses.find(v=>v.book===ref.book&&v.chapter===ref.chapter&&v.verse===ref.verse);if(verse){currentVerse={reference:ref.book+" "+ref.chapter+":"+ref.verse,text:verse.text};$("reference").textContent=currentVerse.reference;document.querySelectorAll(".verse-line").forEach((p,i)=>{if(i+1===ref.verse)p.classList.add("selected")});}}
  $("results").innerHTML="";setStatus("Opened "+ref.book+" "+ref.chapter+".");return;
 }
 const hits=keywordSearch(q);showSearchResults(hits,"Search results");setStatus(hits.length?"Found verses containing your search words.":"No matches found. Try different words.");
}
$("searchBtn").onclick=()=>search($("query").value);
$("query").addEventListener("keydown",e=>{if(e.key==="Enter")search($("query").value)});
document.querySelectorAll("[data-query]").forEach(b=>b.onclick=()=>{$("query").value=b.dataset.query;search(b.dataset.query)});
$("bookSelect").onchange=()=>{currentBook=$("bookSelect").value;currentChapter=1;renderChapter()};
$("chapterSelect").onchange=()=>{currentChapter=Number($("chapterSelect").value);renderChapter()};
$("prevBtn").onclick=()=>moveChapter(-1);$("nextBtn").onclick=()=>moveChapter(1);
$("homeBtn").onclick=e=>{e.preventDefault();currentBook="Genesis";currentChapter=1;renderChapter();window.scrollTo({top:0,behavior:"smooth"})};
$("micBtn").onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){setStatus("Voice search is not supported in this browser. Use Chrome on Android or type your search.");return;}
 const rec=new SR();rec.lang="en-US";rec.interimResults=false;rec.maxAlternatives=1;
 rec.onstart=()=>setStatus("Listening… speak a Bible reference or search words.");
 rec.onerror=()=>setStatus("Microphone unavailable. Allow microphone access in your browser settings.");
 rec.onresult=e=>{$("query").value=e.results[0][0].transcript;search($("query").value)};
 rec.onend=()=>{};rec.start();
};
function getVoice(kind){
 const voices=speechSynthesis.getVoices();const female=/female|woman|samantha|zira|karen|victoria|susan|aria/i;const male=/male|man|david|daniel|george|mark|james|guy/i;
 return voices.find(v=>(kind==="female"?female:male).test(v.name))||voices.find(v=>v.lang.startsWith("en"))||null;
}
function speak(text){
 if(!("speechSynthesis" in window)){setStatus("Audio reading is not supported on this device.");return;}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const v=getVoice($("voiceSelect").value);if(v)u.voice=v;u.rate=.92;speechSynthesis.speak(u);
}
$("readBtn").onclick=()=>{const data=bible.get(currentBook);const verses=data?.chapters?.[currentChapter-1]?.verses||[];speak(currentBook+" chapter "+currentChapter+". "+verses.map((v,i)=>(i+1)+". "+(v.text||v)).join(" "))};
$("stopBtn").onclick=()=>speechSynthesis.cancel();
function renderBookmarks(){
 const box=$("bookmarks");box.innerHTML="";
 if(!bookmarks.length){box.textContent="No bookmarks saved yet.";return;}
 bookmarks.forEach(item=>{const row=document.createElement("div");row.className="bookmark-row";const open=document.createElement("button");open.textContent=item.reference;open.onclick=()=>{const r=findReference(item.reference);if(r){currentBook=r.book;currentChapter=r.chapter;renderChapter();}};const del=document.createElement("button");del.textContent="Remove";del.className="remove-bookmark";del.onclick=()=>{bookmarks=bookmarks.filter(x=>x.reference!==item.reference);localStorage.setItem("voiceBibleBookmarks",JSON.stringify(bookmarks));renderBookmarks()};row.append(open,del);box.append(row)});
}
$("bookmarkBtn").onclick=()=>{
 const reference=currentVerse?.reference||currentBook+" "+currentChapter;
 if(!bookmarks.some(x=>x.reference===reference)){bookmarks.unshift({reference});localStorage.setItem("voiceBibleBookmarks",JSON.stringify(bookmarks));renderBookmarks();$("bookmarkBtn").textContent="♥";}
 else setStatus("That passage is already bookmarked.");
};
const daily=[["Psalm 23:1","The LORD is my shepherd; I shall not want."],["Proverbs 3:5","Trust in the LORD with all thine heart; and lean not unto thine own understanding."],["Philippians 4:13","I can do all things through Christ which strengtheneth me."],["Isaiah 40:31","But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles."]];
const today=Math.floor(Date.now()/86400000)%daily.length;$("dailyVerse").textContent="“"+daily[today][1]+"”";$("dailyRef").textContent=daily[today][0]+" · KJV";
loadBible();