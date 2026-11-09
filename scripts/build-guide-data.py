#!/usr/bin/env python3
"""Build the data behind the guide on the Recordings page from a cbfs-transcripts checkout.

Usage: python3 scripts/build-guide-data.py [PATH_TO_CBFS_TRANSCRIPTS]
Reads topics/scored.csv, index.csv and transcripts/*.txt; writes src/data/guide/guide.json
and src/data/guide/transcripts/<video_id>.json. The units below are the guide's curriculum.
"""
import bisect
import csv
import json
import re
import sys
from pathlib import Path

CBFS = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "dev/git.lotus.yt/cbfs-transcripts")
OUT = Path(__file__).resolve().parent.parent / "src/data/guide"
# Hand-edited units: intro and stops (moment, note and quote) chosen by an editor, overriding the automatic picks
CURATED = Path(__file__).resolve().parent / "guide-curation.json"

PARTS = [
 ("Places",[
  ("north","Freedom North",["Northern Civil Rights and Jim Crow North"],"The movement outside the South: segregation by neighborhood rather than by statute, and the organizers who made it visible in New York, Detroit, Boston and Cleveland."),
  ("harlem","Harlem",["Harlem"],"Harlem as a place of schools, churches, uprisings and campus fights, from the Teachers Union of the 1930s to the 1964 rebellion and Malcolm X's city."),
  ("brooklyn","Brooklyn",["Brooklyn","CORE"],"Bedford-Stuyvesant and Brooklyn CORE: garbage, housing, construction jobs, and the institutions people built for themselves."),
  ("south","The Jim Crow South",["Jim Crow South and Segregation","Lynching and Racial Violence","Mississippi"],"Disfranchisement, police killings and the segregation scholarships that sent Southern teachers North, and how Jim Crow's logic outlived Brown."),
 ]),
 ("Movements",[
  ("power","Black Power",["Black Power"],"Black Power beyond its myths: its roots in Jim Crow, its reading movement, its feminists and its local economics."),
  ("panthers","The Black Panther Party",["Black Panther Party","Fred Hampton","Young Lords"],"The Panthers and their allies from Oakland to Chicago to the South Bronx: survival programs, the Rainbow Coalition and the women who ran it all."),
  ("left","The Black left",["Communist Party and the Black Left","Paul Robeson","Vicki Garvin"],"Communists, Popular Front women and the radicals who carried their politics from the 1930s into Black Power."),
  ("world","Internationalism",["Internationalism and Anticolonialism","Caribbean and Afro-Latinx Connections","Black Nationalism and Pan-Africanism","Garvey Movement and UNIA"],"Freedom struggles that crossed borders: anticolonial thinkers, Panthers in Algeria, Africa solidarity and Black movements in the Pacific."),
 ]),
 ("People",[
  ("women","Black women radicals",["Black Women and Gender"],"The series' most discussed theme: Black women as organizers, thinkers and survivors, from 1600 to the present."),
  ("malcolm","Malcolm X",["Malcolm X"],"Malcolm X through his mother Louise Little, his Garveyite roots, his New York years and the young radicals he drew in."),
  ("icons","King, Parks and the icons",["Martin Luther King Jr.","Rosa Parks","Coretta Scott King"],"Rethinking the most familiar figures: Rosa Parks's lifelong radicalism, King in the North, and Coretta Scott King's own politics."),
 ]),
 ("The state",[
  ("police","Policing and police violence",["Policing and Police Violence"],"A long history of police violence and the fight against it, from 1930s Harlem to counterinsurgency abroad and reform at home."),
  ("prisons","Prisons and political prisoners",["Prisons and Mass Incarceration","Political Prisoners","Attica"],"Mass incarceration as a long project: Attica's aftermath, women behind bars, Los Angeles as a city of inmates, and prisons as empire."),
  ("repression","Surveillance and repression",["COINTELPRO, Surveillance and Repression","Cold War and McCarthyism"],"FBI campaigns against King, the Panthers and even high school students, and the Cold War purges that came before them."),
 ]),
 ("Life and institutions",[
  ("schools","Schools and students",["Education and School Desegregation","Students and Youth Activism","HBCUs"],"Education as a freedom struggle: community control, Harlem Prep, special education tracking, and liberal resistance to desegregation in New York."),
  ("work","Work, money and self-determination",["Economics, Labor and Self-Determination","Housing and Urban Space"],"Jobs, banks, tenants and cooperatives: the economic side of freedom, from enslaved people's markets to DC tenant organizing."),
  ("faith","Faith and the church",["Religion and the Black Church"],"Churches as organizing spaces, and radicals who reconciled faith with Marxism."),
  ("health","Health and medicine",["Health and Medicine","Food and Leisure"],"Medical racism and the movements against it, from the Lincoln Hospital takeover to hospital closings and Black women's fitness."),
  ("culture","Culture, arts and music",["Culture, Arts and Music","Black Arts Movement"],"Music, theater and literature as part of the struggle, and who gets to archive them."),
  ("gender","Sexuality, feminism and reproductive justice",["Sexuality and LGBTQ History","Reproductive Justice","Joan Little"],"Black queer history before Stonewall, the Free Joan Little campaign, HIV and reproductive justice."),
  ("vote","Voting, law and power",["Voting Rights and Electoral Politics","Shirley Chisholm","Law, Courts and Civil Rights Legislation"],"The century-long fight for the vote and the court cases, from Brown to Milliken, that shaped where people live and learn."),
 ]),
 ("Method",[
  ("method","How history gets made",["Archives and the Schomburg Center","Biography as Method","Memory, Monuments and Public History"],"Archives, scrapbooks, finding aids and biography: how the scholars in these recordings found their sources."),
 ]),
]

TRIVIAL = {"thank you", "guitar solo", "applause", "music"}


def clip(text, n):
    words = text.split()
    return " ".join(words[:n]) + ("…" if len(words) > n else "")


def paragraphs(path):
    """[[seconds, text], ...] from a transcript file, without filler from music and breaks."""
    out = []
    for line in path.read_text().splitlines():
        m = re.match(r"\[(\d+):(\d\d)\] (.*)", line)
        if m:
            text = re.sub(r"\s*>>\s*", " ", m[3]).strip()
            if text.lower().strip(" .[]") not in TRIVIAL:
                out.append([int(m[1]) * 60 + int(m[2]), text])
    return out


def real_note(r):
    return len(r["note"]) > 40 and not re.match(r"(The )?[Ss]ame ", r["note"])


def choose(pick, n=5):
    """Up to n moments from different years, strongest first, shown in date order."""
    pick = sorted(pick, key=lambda r: (-int(r["score"]), -min(len(r["note"]), 120)))
    sel, years = [], set()
    for r in pick:
        if r["date"][:4] not in years:
            sel.append(r)
            years.add(r["date"][:4])
        if len(sel) == n:
            break
    sel += [r for r in pick if r not in sel][: n - len(sel)]
    return sorted(sel, key=lambda r: r["date"])


def main():
    rows = list(csv.DictReader((CBFS / "topics/scored.csv").open()))
    index = {r["video_id"]: r for r in csv.DictReader((CBFS / "index.csv").open())}
    moments = [r for r in rows if r["source"] == "reviewed" and int(r["score"]) >= 2 and real_note(r)]
    titles = {r["video_id"]: r["event"] for r in rows}

    (OUT / "transcripts").mkdir(parents=True, exist_ok=True)
    paras = {vid: paragraphs(CBFS / "transcripts" / f"{r['date']}_{vid}.txt") for vid, r in index.items()}

    def item(r, words=48):
        starts = [p[0] for p in paras[r["video_id"]]]
        k = int(r["key_seconds"])
        i = max(bisect.bisect_right(starts, k) - 1, 0)
        return {"t": r["topic"], "c": r["category"], "v": r["video_id"], "k": k, "a": starts[i] if starts else 0,
                "s": int(r["score"]), "n": r["note"], "x": clip(r["excerpt"], words)}

    by_topic = {}
    for r in moments:
        by_topic.setdefault(r["topic"], []).append(r)

    curated = json.loads(CURATED.read_text()) if CURATED.exists() else {}
    categories = {r["topic"]: r["category"] for r in rows}
    scores = {(r["topic"], r["video_id"]): int(r["score"]) for r in rows if r["source"] == "reviewed"}

    def curated_item(c):
        starts = [p[0] for p in paras[c["video_id"]]]
        k = int(c["start_seconds"])
        i = max(bisect.bisect_right(starts, k) - 1, 0)
        return {"t": c["topic"], "c": categories.get(c["topic"], ""), "v": c["video_id"], "k": k, "a": starts[i] if starts else 0,
                "s": scores.get((c["topic"], c["video_id"]), 2), "n": c["note"], "x": c["quote"]}

    parts = []
    for name, units in PARTS:
        out_units = []
        for key, title, topics, intro in units:
            rs = sorted((r for t in topics for r in by_topic.get(t, [])),
                        key=lambda r: (-int(r["score"]), topics.index(r["topic"])))
            seen, pick = set(), []
            for r in rs:
                if r["video_id"] not in seen:
                    seen.add(r["video_id"])
                    pick.append(r)
            if key in curated:
                cu = curated[key]
                stop_items = [curated_item(c) for c in sorted(cu["stops"], key=lambda c: index[c["video_id"]]["date"])]
                used = {c["video_id"] for c in cu["stops"]}
                intro = cu.get("intro") or intro
                more = sorted((r for r in pick if r["video_id"] not in used), key=lambda r: r["date"])
            else:
                stops = choose(pick)
                stop_items = [item(r) for r in stops]
                more = sorted((r for r in pick if r not in stops), key=lambda r: r["date"])
            out_units.append({"key": key, "title": title, "intro": intro, "topics": topics,
                              "stops": stop_items, "more": [item(r, 30) for r in more]})
        parts.append({"name": name, "units": out_units})

    recordings = {v: {"date": r["date"], "kind": r["caption_type"], "title": titles.get(v, "")} for v, r in index.items()}
    guide = {"parts": parts, "finder": [item(r, 30) for r in moments], "recordings": recordings}
    (OUT / "guide.json").write_text(json.dumps(guide, ensure_ascii=False, separators=(",", ":")) + "\n")

    for vid, ps in paras.items():
        mine = sorted((item(r, 0) for r in moments if r["video_id"] == vid), key=lambda m: m["k"])
        for m in mine:
            del m["x"], m["v"]
        (OUT / "transcripts" / f"{vid}.json").write_text(
            json.dumps({"paragraphs": ps, "moments": mine}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(moments)} moments, {sum(len(p['units']) for p in parts)} units, {len(paras)} recordings")


if __name__ == "__main__":
    main()
