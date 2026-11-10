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
async function fetchBook(name,osis){
  const url=DATA_URL+osis+".json";
  let lastError;
  // Use the saved Bible file first so previously downloaded books open without data.
  try{
    if("caches" in window){
      const saved=await caches.match(url);
      if(saved){
        const data=await saved.clone().json();
        if(Array.isArray(data.chapters)){bible.set(name,data);return true;}
      }
    }
  }catch(error){console.warn("Could not read cached Bible book:",name,error);}
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url);
      if(!response.ok) throw new Error("HTTP "+response.status+" for "+name);
      const data=await response.clone().json();
      if(!Array.isArray(data.chapters)) throw new Error("Unexpected Bible data for "+name);
      if("caches" in window){
        try{const cache=await caches.open("voice-bible-kjv-data-v1");await cache.put(url,response.clone());}catch(cacheError){console.warn("Bible cache could not be saved:",cacheError);}
      }
      bible.set(name,data);
      return true;
    }catch(error){lastError=error;}
  }
  console.warn("Could not load Bible book:",name,lastError);
  return false;
}
function rebuildVerseIndex(){
  allVerses=[];
  for(const [name] of BOOKS){
    const data=bible.get(name);
    if(!data) continue;
    (data.chapters||[]).forEach((chapter,ci)=>(chapter.verses||[]).forEach((v,vi)=>{
      allVerses.push({book:name,chapter:chapter.chapter||ci+1,verse:v.number||vi+1,text:v.text||v});
    }));
  }
}
async function loadBible(){
  setStatus("Loading the King James Bible…");
  const homeStatus=$("contentsBibleStatus");
  if(homeStatus) homeStatus.textContent="Loading Bible text…";
  $("bookSelect").innerHTML=BOOKS.map(([n])=>'<option value="'+n+'">'+n+'</option>').join("");
  let loaded=0,failed=[];
  // Load Genesis first so reading can begin without waiting for all 66 books.
  const genesis=BOOKS[0];
  if(await fetchBook(genesis[0],genesis[1])) loaded++;
  else failed.push(genesis);
  if(bible.has(currentBook)){renderChapter();renderBookmarks();}
  setStatus("Bible loading… "+loaded+" of 66 books");
  // Load the remaining books in small batches to reduce network bursts.
  for(let start=1;start<BOOKS.length;start+=8){
    const batch=BOOKS.slice(start,start+8);
    const results=await Promise.all(batch.map(([name,osis])=>fetchBook(name,osis)));
    results.forEach((ok,i)=>{if(ok)loaded++;else failed.push(batch[i]);});
    setStatus("Bible loading… "+loaded+" of 66 books");
    if(homeStatus) homeStatus.textContent="Bible loading… "+loaded+" of 66 books";
    rebuildVerseIndex();
    if(bible.has(currentBook))renderChapter();
  }
  rebuildVerseIndex();
  $("bookSelect").value=currentBook;
  if(bible.has(currentBook))renderChapter();
  renderBookmarks();
  if(failed.length){
    const names=failed.map(x=>x[0]).join(", ");
    setStatus("Loaded "+loaded+" of 66 books. "+(navigator.onLine?"Some books need an internet retry: "+names+".":"You are offline; connect once to download the remaining books."));
    if(homeStatus)homeStatus.textContent="Loaded "+loaded+" of 66 books. "+(navigator.onLine?"Some books still need downloading.":"Connect to the internet once to save the remaining books for offline reading.");
  }else{
    setStatus("All 66 KJV books are downloaded and ready for offline reading.");
    if(homeStatus)homeStatus.textContent="All 66 books are saved on this device for offline reading.";
  }
}
function chapterNumbers(book){return (bible.get(book)?.chapters||[]).map((c,i)=>c.chapter||i+1)}
function chapterCount(book){return Math.max(0,...chapterNumbers(book))}
function getChapterData(book,number){const chapters=bible.get(book)?.chapters||[];return chapters.find((c,i)=>(c.chapter||i+1)===number)||null}
function updateVerseActions(){
 const ready=!!currentVerse;
 $("copyVerseBtn").disabled=!ready;
 $("shareVerseBtn").disabled=!ready;
 $("verseActionHint").textContent=ready?"Selected: "+currentVerse.reference:"Tap a verse, then copy or share it.";
}
function renderChapter(){
 currentVerse=null;
 updateVerseActions();
 const data=bible.get(currentBook); if(!data)return;
 const chapters=data.chapters||[]; const numbers=chapterNumbers(currentBook); if(!numbers.length)return;
 if(!numbers.includes(currentChapter))currentChapter=numbers[0];
 $("chapterSelect").innerHTML=numbers.map(n=>'<option value="'+n+'">'+n+'</option>').join("");
 $("chapterSelect").value=currentChapter; $("bookSelect").value=currentBook;
 $("reference").textContent=currentBook+" "+currentChapter;
 const verses=getChapterData(currentBook,currentChapter)?.verses||[];
 $("chapterText").innerHTML="";
 verses.forEach((v,i)=>{
  const p=document.createElement("p");p.className="verse-line";
  const num=document.createElement("sup");num.textContent=i+1;
  const span=document.createElement("span");span.textContent=v.text||v;
  p.append(num,span);
  p.addEventListener("click",()=>{document.querySelectorAll(".verse-line.selected").forEach(x=>x.classList.remove("selected"));p.classList.add("selected");currentVerse={reference:currentBook+" "+currentChapter+":"+(v.number||i+1),text:v.text||v};updateVerseActions();setStatus("Selected "+currentVerse.reference+". You can now copy, share, or read it aloud.");});
  $("chapterText").append(p);
 });
 $("prevBtn").disabled=currentBook==="Genesis"&&currentChapter===1;
 $("nextBtn").disabled=currentBook==="Revelation"&&currentChapter===chapterCount(currentBook);
}
function moveChapter(delta){
 let index=BOOKS.findIndex(x=>x[0]===currentBook),numbers=chapterNumbers(currentBook),at=numbers.indexOf(currentChapter),next=numbers[at+delta];
 if(next===undefined&&delta<0&&index>0){currentBook=BOOKS[index-1][0];const previous=chapterNumbers(currentBook);if(previous.length)currentChapter=previous[previous.length-1];}
 else if(next===undefined&&delta>0&&index<BOOKS.length-1){currentBook=BOOKS[index+1][0];const following=chapterNumbers(currentBook);if(following.length)currentChapter=following[0];}
 else if(next!==undefined)currentChapter=next;
 renderChapter();
}
function spokenNumber(value){
 const small={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
 const words=String(value).toLowerCase().replace(/-/g," ").trim().split(/\s+/);
 if(/^\d+$/.test(value))return Number(value);
 let total=0,part=0;
 for(const w of words){if(small[w]!==undefined)part+=small[w];else if(w==="and")continue;else return null;}
 total+=part;return total||null;
}
function findReference(q){
 let cleaned=String(q).toLowerCase().replace(/[?!.,]/g," ").replace(/\b(first|1st)\s+(?=samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john)/g,"1 ")
 .replace(/\b(second|2nd)\s+(?=samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john)/g,"2 ")
 .replace(/\b(third|3rd)\s+(?=john)/g,"3 ").trim()
 .replace(/^(please\s+)?(open|read|show|find|go to|turn to)\s+/,"")
 .replace(/\b(chapter)\b/g," ").replace(/\b(verse|verses)\b/g,":")
 .replace(/\b(and)\b/g," ").replace(/\s+/g," ").trim();
 const match=cleaned.match(/^(.+?)\s+(\d+|[a-z]+(?:[ -][a-z]+)*)\s*(?::\s*(\d+|[a-z]+(?:[ -][a-z]+)*))?(?:\s*[-–]\s*(\d+|[a-z]+(?:[ -][a-z]+)*))?$/i);
 if(!match)return null;
 const book=BOOKS.find(([n])=>normal(n)===normal(match[1]))||BOOKS.find(([n])=>normal(n).startsWith(normal(match[1])));
 if(!book)return null;
 const chapter=spokenNumber(match[2]),verse=match[3]?spokenNumber(match[3]):null,end=match[4]?spokenNumber(match[4]):null;
 if(!chapter)return null;
 return {book:book[0],chapter,verse,end};
}
function showSearchResults(items,title){
 const wrap=$("results");wrap.innerHTML="";
 if(!items.length){wrap.textContent="No matching verses found. Try a Bible reference or a different word.";return;}
 const heading=document.createElement("h3");heading.textContent=title+" · "+items.length+" results";wrap.append(heading);
 items.slice(0,25).forEach(item=>{
  const b=document.createElement("button");b.className="result-item";
  const strong=document.createElement("strong");strong.textContent=item.book+" "+item.chapter+":"+item.verse;
  const text=document.createElement("span");text.textContent=item.text;
  b.append(strong,text);b.onclick=()=>{currentBook=item.book;currentChapter=item.chapter;renderChapter();currentVerse={reference:strong.textContent,text:item.text};updateVerseActions();$("reference").textContent=currentVerse.reference;document.querySelectorAll(".verse-line").forEach((p,i)=>{if(i+1===item.verse)p.classList.add("selected")});$("chapterText").scrollIntoView({behavior:"smooth",block:"start"});};
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
  if(ref.verse){const verse=allVerses.find(v=>v.book===ref.book&&v.chapter===ref.chapter&&v.verse===ref.verse);if(verse){currentVerse={reference:ref.book+" "+ref.chapter+":"+ref.verse,text:verse.text};updateVerseActions();$("reference").textContent=currentVerse.reference;document.querySelectorAll(".verse-line").forEach((p,i)=>{if(i+1===ref.verse)p.classList.add("selected")});}}
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
let speechRunId=0;
let speechPaused=false;
let speechChunks=[];
let speechChunkIndex=0;
let speechVoiceKind="female";
function speak(text){
 if(!("speechSynthesis" in window)||!("SpeechSynthesisUtterance" in window)){
  setStatus("Audio reading is not supported on this device. Try Chrome on Android.");return;
 }
 const synth=window.speechSynthesis;
 const runId=++speechRunId;
 synth.cancel();
 speechPaused=false;
 speechVoiceKind=$("voiceSelect").value;
 speechChunks=[];
 speechChunkIndex=0;
 // Keep each utterance short for better reliability on Android phones.
 const sentences=String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[String(text)];
 let part="";
 sentences.forEach(sentence=>{
  sentence.trim().split(/\\s+/).forEach(word=>{
   if((part+" "+word).trim().length>160&&part){speechChunks.push(part.trim());part=word;}
   else part=(part+" "+word).trim();
  });
  if(part){speechChunks.push(part.trim());part="";}
 });
 if(!speechChunks.length){setStatus("There is no text available to read.");return;}
 setStatus("Starting voice reading…");
 const playNext=()=>{
  if(runId!==speechRunId||speechPaused)return;
  if(speechChunkIndex>=speechChunks.length){setStatus("Finished reading.");return;}
  const utterance=new SpeechSynthesisUtterance(speechChunks[speechChunkIndex]);
  const voices=synth.getVoices();
  const pattern=speechVoiceKind==="female"
   ?/female|woman|samantha|zira|karen|victoria|susan|aria|google.*uk.*english.*female/i
   :/male|man|david|daniel|george|mark|james|guy|google.*uk.*english.*male/i;
  const voice=voices.find(v=>pattern.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;
  if(voice)utterance.voice=voice;
  utterance.rate=.9;utterance.pitch=1;
  const thisChunk=++speechChunkIndex;
  utterance.onstart=()=>{if(runId===speechRunId)setStatus("Reading aloud… ("+thisChunk+" of "+speechChunks.length+")");};
  utterance.onend=()=>{if(runId===speechRunId&&!speechPaused)playNext();};
  utterance.onerror=event=>{
   if(runId!==speechRunId||event.error==="canceled"||event.error==="interrupted")return;
   setStatus("Audio reading stopped. Tap Read chapter to try again.");
  };
  synth.speak(utterance);
 };
 // Start immediately inside the button action; mobile browsers can reject delayed speech.
 playNext();
}
$("readBtn").onclick=()=>{const verses=getChapterData(currentBook,currentChapter)?.verses||[];if(!verses.length){setStatus("This chapter is not loaded yet. Please wait and try again.");return;}speak(currentBook+" chapter "+currentChapter+". "+verses.map((v,i)=>(v.number||i+1)+". "+(v.text||v)).join(" "))};
$("readVerseBtn").onclick=()=>{if(!currentVerse){setStatus("Tap a verse in the Bible text first, then choose Read selected verse.");return;}speak(currentVerse.reference+". "+currentVerse.text)};
$("copyVerseBtn").onclick=async()=>{
 if(!currentVerse)return;
 const text=currentVerse.reference+" (KJV)\n"+currentVerse.text;
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{const field=document.createElement("textarea");field.value=text;field.style.position="fixed";field.style.opacity="0";document.body.append(field);field.select();const copied=document.execCommand("copy");field.remove();if(!copied)throw new Error("Copy unavailable");}
  $("verseActionHint").textContent=currentVerse.reference+" copied. Paste it anywhere.";
 }catch(error){$("verseActionHint").textContent="Copy is unavailable in this browser. Try Share verse instead.";console.warn("Verse copy failed:",error);}
};
$("shareVerseBtn").onclick=async()=>{
 if(!currentVerse)return;
 const title=currentVerse.reference+" — King James Version";
 const text=currentVerse.reference+" (KJV)\n"+currentVerse.text;
 if(navigator.share){
  try{await navigator.share({title,text});$("verseActionHint").textContent="Share options opened for "+currentVerse.reference+".";return;}
  catch(error){if(error&&error.name==="AbortError"){$("verseActionHint").textContent="Sharing cancelled.";return;}console.warn("Verse sharing failed:",error);}
 }
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);$("verseActionHint").textContent="Sharing is not supported here. Verse copied; paste it into WhatsApp or another app.";return;}}
 catch(error){console.warn("Verse copy fallback failed:",error);}
 const blob=new Blob([text],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=currentVerse.reference.replace(/[^a-z0-9]+/gi,"-")+".txt";document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
 $("verseActionHint").textContent="Verse saved as a text file. Attach it to a message to share.";
};

$("voiceSelect").addEventListener("change",()=>{
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 speechRunId++;speechPaused=false;speechChunks=[];speechChunkIndex=0;
 setStatus("Narrator set to "+$("voiceSelect").selectedOptions[0].text+". Start reading again to use this voice.");
});
$("pauseBtn").onclick=()=>{
 if(!("speechSynthesis" in window)){setStatus("Pause is not supported by this browser.");return;}
 if(!speechChunks.length){setStatus("Start reading first, then tap Pause.");return;}
 speechPaused=true;
 window.speechSynthesis.pause();
 setStatus("Reading paused. Tap Resume to continue.");
};
$("resumeBtn").onclick=()=>{
 if(!("speechSynthesis" in window)){setStatus("Resume is not supported by this browser.");return;}
 if(!speechChunks.length){setStatus("There is no reading to resume. Tap Read chapter or Read selected verse.");return;}
 if(!speechPaused){setStatus("Reading is not paused.");return;}
 speechPaused=false;
 window.speechSynthesis.resume();
 // If a chunk ended while paused, restart from the next unread chunk.
 if(!window.speechSynthesis.speaking&&!window.speechSynthesis.pending){
  const remaining=speechChunks.slice(speechChunkIndex).join(" ");
  if(remaining)speak(remaining);
  else setStatus("Finished reading.");
 }else setStatus("Resuming voice reading…");
};
$("stopBtn").onclick=()=>{
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 speechRunId++;speechPaused=false;speechChunks=[];speechChunkIndex=0;
 setStatus("Voice reading stopped.");
};
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
function showPage(page){
  ["coverPage","contentsPage","readerPage"].forEach(id=>$(id).classList.add("hidden"));
  $(page).classList.remove("hidden");
  window.scrollTo({top:0,behavior:"instant"});
}
function buildContents(){
  BOOKS.forEach(([name],index)=>{
    const button=document.createElement("button");
    button.type="button";button.className="content-book";button.textContent=name;
    button.addEventListener("click",()=>openBook(name));
    (index<39?$("oldContents"):$("newContents")).append(button);
  });
}
function openBook(name){
  currentBook=name;currentChapter=1;currentVerse=null;
  showPage("readerPage");
  if(bible.has(name))renderChapter();
  else setStatus(name+" is still loading. Please wait a moment and try again.");
}
$("openBibleBtn").onclick=()=>showPage("contentsPage");
// Make the entire cover respond to taps on mobile, not only the invisible overlay.
$("coverPage").addEventListener("click",event=>{if(event.target.closest("#openBibleBtn")||event.target.closest(".cover-frame"))showPage("contentsPage");});
$("backCoverBtn").onclick=()=>showPage("coverPage");
$("startReadingBtn").onclick=()=>openBook("Genesis");
$("contentsBackBtn").onclick=()=>showPage("contentsPage");
// Home-page voice search works before the user opens any Bible book.
function runHomeSearch(query){
  if(!query.trim()){$("homeSearchStatus").textContent="Please speak or type a Bible reference or search topic.";return;}
  $("query").value=query;
  showPage("readerPage");
  search(query);
}
$("homeSearchBtn").onclick=()=>runHomeSearch($("homeQuery").value);
$("homeQuery").addEventListener("keydown",e=>{if(e.key==="Enter")runHomeSearch($("homeQuery").value)});
$("homeMicBtn").onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$("homeSearchStatus").textContent="Voice search is not supported here. Please type your search or use Chrome.";return;}
  const rec=new SR();rec.lang="en-US";rec.interimResults=false;rec.maxAlternatives=1;
  $("homeSearchStatus").textContent="Listening… say a Bible reference or topic.";
  rec.onresult=e=>{const spoken=e.results[0][0].transcript;$("homeQuery").value=spoken;runHomeSearch(spoken);};
  rec.onerror=()=>{$("homeSearchStatus").textContent="Microphone unavailable. Allow microphone access in your browser."};
  rec.start();
};
// Sermon notes are stored locally on this device.
const notesKey="voiceBibleSermonNotes";
$("sermonNotes").value=localStorage.getItem(notesKey)||"";
$("sermonNotes").addEventListener("input",()=>{
  localStorage.setItem(notesKey,$("sermonNotes").value);
  $("notesStatus").textContent="Saved on this device.";
});
$("dictateNotesBtn").onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$("notesStatus").textContent="Voice dictation is not supported here. Please type your notes or use Chrome.";return;}
  const rec=new SR();rec.lang="en-US";rec.interimResults=false;rec.maxAlternatives=1;
  $("notesStatus").textContent="Listening… dictate your sermon notes.";
  rec.onresult=e=>{
    const spoken=e.results[0][0].transcript;
    const area=$("sermonNotes");area.value+=(area.value?"\n":"")+spoken;
    localStorage.setItem(notesKey,area.value);$("notesStatus").textContent="Dictation saved on this device.";
  };
  rec.onerror=()=>{$("notesStatus").textContent="Microphone unavailable. Allow microphone access in your browser."};
  rec.start();
};
$("shareNotesBtn").onclick=async()=>{
  const notes=$("sermonNotes").value.trim();
  if(!notes){$("notesStatus").textContent="Write or dictate some sermon notes before sharing.";return;}
  const title="My Sermon Notes";
  const shareText=title+"\\n\\n"+notes;
  if(navigator.share){
    try{
      await navigator.share({title,text:shareText});
      $("notesStatus").textContent="Share sheet opened. Choose WhatsApp, email, or another app.";
      return;
    }catch(error){
      if(error&&error.name==="AbortError"){
        $("notesStatus").textContent="Sharing cancelled. Your notes are still saved on this device.";
        return;
      }
      console.warn("Native sharing failed:",error);
    }
  }
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(shareText);
      $("notesStatus").textContent="Notes copied. Paste them into WhatsApp, email, or another app.";
      return;
    }
  }catch(error){console.warn("Clipboard sharing failed:",error);}
  // Offline-friendly fallback: save a text file that can be attached to a message.
  const blob=new Blob([shareText],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="sermon-notes.txt";
  document.body.append(link);link.click();link.remove();
  URL.revokeObjectURL(url);
  $("notesStatus").textContent="Sermon notes downloaded as a text file. Attach it to a message to share.";
};
$("clearNotesBtn").onclick=()=>{
  $("sermonNotes").value="";localStorage.removeItem(notesKey);
  $("notesStatus").textContent="Notes cleared from this device.";
};
buildContents();
loadBible();

// Keep the user informed when the phone changes between online and offline.
window.addEventListener("offline",()=>{setStatus("You are offline. Downloaded Bible books remain available.");});
window.addEventListener("online",()=>{setStatus("Internet connection restored. Checking Bible downloads…");});


/* Church presentation mode: same-device phone/laptop projection */
let presentationFont=30,presentationDark=true;
function renderPresentation(){
 const data=getChapterData(currentBook,currentChapter);
 if(!data){$("churchStatus").textContent="This passage is not downloaded yet. Connect to the internet and try again.";return;}
 $("projectionReference").textContent=currentBook+" "+currentChapter;
 $("projectionVerses").innerHTML="";
 (data.verses||[]).forEach((v,i)=>{
  const line=document.createElement("p");
  const number=document.createElement("strong");number.textContent=(v.number||i+1)+". ";
  const words=document.createElement("span");words.textContent=v.text||v;
  line.append(number,words);$("projectionVerses").append(line);
 });
 $("churchReference").value=currentBook+" "+currentChapter;
 $("projectionVerses").style.fontSize=presentationFont+"px";
 $("projectionScreen").classList.toggle("projection-light",!presentationDark);
 $("churchStatus").textContent="Displaying "+currentBook+" "+currentChapter+".";
}
function displayChurchReference(value){
 const ref=findReference(value);
 if(!ref){$("churchStatus").textContent="I could not understand that reference. Try a format such as John 3:16.";return;}
 if(!bible.has(ref.book)){ $("churchStatus").textContent=ref.book+" is still downloading. Please try again shortly.";return;}
 const max=chapterCount(ref.book);
 if(ref.chapter<1||ref.chapter>max){$("churchStatus").textContent="That chapter does not exist.";return;}
 currentBook=ref.book;currentChapter=ref.chapter;currentVerse=null;
 renderPresentation();
 if(ref.verse){
  const verseList=getChapterData(currentBook,currentChapter)?.verses||[];
  const last=Math.min(ref.end||ref.verse,verseList.length);
  const selected=verseList.slice(ref.verse-1,last);
  if(selected.length){
   $("projectionVerses").innerHTML="";
   selected.forEach((verse,index)=>{
    const line=document.createElement("p");
    const number=document.createElement("strong");number.textContent=(ref.verse+index)+". ";
    const words=document.createElement("span");words.textContent=verse.text||verse;
    line.append(number,words);$("projectionVerses").append(line);
   });
   $("projectionReference").textContent=currentBook+" "+currentChapter+":"+ref.verse+(last>ref.verse?"–"+last:"");
  }
 }
}
$("churchModeBtn").onclick=()=>{showPage("churchPage");renderPresentation();};
$("churchBackBtn").onclick=()=>showPage("contentsPage");
$("churchGoBtn").onclick=()=>displayChurchReference($("churchReference").value);
$("churchReference").addEventListener("keydown",e=>{if(e.key==="Enter")displayChurchReference($("churchReference").value);});
$("churchPrevBtn").onclick=()=>{moveChapter(-1);renderPresentation();};
$("churchNextBtn").onclick=()=>{moveChapter(1);renderPresentation();};
$("churchSmallerBtn").onclick=()=>{presentationFont=Math.max(18,presentationFont-3);renderPresentation();};
$("churchLargerBtn").onclick=()=>{presentationFont=Math.min(64,presentationFont+3);renderPresentation();};
$("churchThemeBtn").onclick=()=>{presentationDark=!presentationDark;renderPresentation();};
$("churchFullscreenBtn").onclick=async()=>{
 const target=$("projectionScreen");
 try{if(target.requestFullscreen)await target.requestFullscreen();else $("churchStatus").textContent="Full screen is not supported in this browser. You can still mirror the screen.";}
 catch(error){$("churchStatus").textContent="Full screen was blocked. Use your browser menu or screen mirroring.";}
};
$("churchExitBtn").onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});};
$("churchMicBtn").onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){$("churchStatus").textContent="Voice search is not supported here. Type the reference instead.";return;}
 const rec=new SR();rec.lang="en-US";rec.interimResults=false;rec.maxAlternatives=1;
 $("churchStatus").textContent="Listening… say a passage such as John chapter three.";
 rec.onresult=e=>{const spoken=e.results[0][0].transcript;$("churchReference").value=spoken;displayChurchReference(spoken);};
 rec.onerror=()=>{$("churchStatus").textContent="Microphone unavailable. Allow microphone access or type the reference.";};
 rec.start();
};

document.addEventListener("keydown",event=>{
 if(!document.fullscreenElement||$("churchPage").classList.contains("hidden"))return;
 if(event.key==="ArrowRight"||event.key==="PageDown"){event.preventDefault();moveChapter(1);renderPresentation();}
 if(event.key==="ArrowLeft"||event.key==="PageUp"){event.preventDefault();moveChapter(-1);renderPresentation();}
});
