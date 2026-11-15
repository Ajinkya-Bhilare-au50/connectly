"""
Generate fictional people (with posts, replies, follows, likes and reposts) for demos.

All names, bios and posts are made up; emails use the reserved example.com domain and
avatars are left empty (the app shows initials). Every generated document is tagged with
`demoBatch` so it can be removed cleanly.

Usage (from the backend folder):
    .\\.venv\\Scripts\\python.exe -m scripts.generate_people             # add 65 women + 95 men
    .\\.venv\\Scripts\\python.exe -m scripts.generate_people --women 10 --men 10
    .\\.venv\\Scripts\\python.exe -m scripts.generate_people --remove    # delete the generated people

Generated accounts share one password: SEED_DEFAULT_USER_PASSWORD from .env
(or "Connectly123" if that isn't set).
"""

import argparse
import asyncio
import os
import random
import re
from datetime import UTC, datetime, timedelta

from bson import ObjectId

from app import db
from app.config import BASE_DIR
from app.security import hash_password
from app.social import extract_hashtags

BATCH = "people-v1"

WOMEN = [
    "Aarohi", "Ananya", "Diya", "Isha", "Kavya", "Meera", "Neha", "Pooja", "Priya", "Riya",
    "Saanvi", "Sneha", "Tanvi", "Aditi", "Shruti", "Nidhi", "Pallavi", "Rutuja", "Sakshi", "Vaishnavi",
    "Anjali", "Divya", "Gauri", "Ishita", "Janhavi", "Kritika", "Mansi", "Nikita", "Radhika", "Shreya",
    "Swara", "Tanya", "Urvi", "Vidya", "Yashika", "Aisha", "Fatima", "Zoya", "Sara", "Mehak",
    "Harleen", "Simran", "Jasmine", "Emma", "Olivia", "Sofia", "Mia", "Chloe", "Hana", "Yuki",
    "Lucia", "Amara", "Leah", "Nora", "Elena", "Maya", "Aanya", "Bhavna", "Charvi", "Devika",
    "Esha", "Falguni", "Kiara", "Lavanya", "Mrunal", "Nandini", "Ojasvi", "Prachi", "Ritika", "Sayali",
]
MEN = [
    "Aarav", "Aditya", "Akash", "Amit", "Aniket", "Arjun", "Atharva", "Ayaan", "Chirag", "Darshan",
    "Dev", "Dhruv", "Gaurav", "Harsh", "Ishaan", "Jay", "Karan", "Kunal", "Manav", "Mihir",
    "Nikhil", "Omkar", "Parth", "Pranav", "Rahul", "Rajat", "Rohan", "Rohit", "Sahil", "Sameer",
    "Sanket", "Saurabh", "Shubham", "Siddharth", "Soham", "Tanmay", "Tejas", "Varun", "Vedant", "Vihaan",
    "Vikram", "Vivek", "Yash", "Yuvraj", "Abhishek", "Ankit", "Ashwin", "Bhavesh", "Chetan", "Deepak",
    "Farhan", "Imran", "Kabir", "Zaid", "Arman", "Gurpreet", "Harjot", "Liam", "Noah", "Ethan",
    "Lucas", "Mateo", "Leo", "Kenji", "Daniel", "Samuel", "Omar", "Ravi", "Suraj", "Nilesh",
    "Prathamesh", "Ritesh", "Sagar", "Tushar", "Utkarsh", "Ajinkya", "Mayur", "Hrishikesh", "Kartik", "Lakshya",
    "Mohit", "Neel", "Ojas", "Pratik", "Rushikesh", "Shreyas", "Tarun", "Umesh", "Viraj", "Yogesh",
    "Aman", "Anuj", "Ganesh", "Hemant", "Jatin", "Kedar", "Mandar", "Nitin", "Pushkar", "Sumit",
]
SURNAMES = [
    "Sharma", "Patil", "Deshmukh", "Kulkarni", "Joshi", "Mehta", "Shah", "Iyer", "Nair", "Reddy",
    "Rao", "Gupta", "Verma", "Singh", "Kapoor", "Malhotra", "Bhosale", "Pawar", "Jadhav", "Chavan",
    "Gaikwad", "Shinde", "More", "Kale", "Apte", "Gokhale", "Bhide", "Sawant", "Naik", "Desai",
    "Pillai", "Menon", "Banerjee", "Chatterjee", "Das", "Bose", "Mishra", "Pandey", "Tiwari", "Saxena",
    "Khan", "Sheikh", "Qureshi", "Ansari", "Fernandes", "D'Souza", "Pereira", "Gill", "Sandhu", "Bajwa",
    "Smith", "Garcia", "Kim", "Tanaka", "Rossi", "Silva", "Müller", "Ali", "Hassan", "Chen",
]
CITIES = [
    "Pune, India", "Mumbai, India", "Bengaluru, India", "Delhi, India", "Hyderabad, India", "Chennai, India",
    "Kolkata, India", "Ahmedabad, India", "Jaipur, India", "Nagpur, India", "Nashik, India", "Kochi, India",
    "Indore, India", "Goa, India", "Chandigarh, India", "Lucknow, India", "Dubai, UAE", "London, UK",
    "Toronto, Canada", "Singapore", "Berlin, Germany", "San Francisco, USA", "Sydney, Australia", "Tokyo, Japan",
]
JOBS = [
    "Frontend developer", "Full-stack engineer", "Data analyst", "UX designer", "Product manager",
    "CS student", "Engineering student", "Photographer", "Content creator", "Teacher", "Doctor in training",
    "Chartered accountant", "Marketing lead", "Startup founder", "Mobile developer", "ML engineer",
    "Graphic designer", "Architect", "Musician", "Writer", "DevOps engineer", "QA engineer", "Researcher",
]
INTERESTS = [
    "coffee", "cricket", "football", "travel", "street food", "open source", "photography", "music",
    "anime", "books", "chess", "trekking", "fitness", "gaming", "movies", "cooking", "startups", "design",
    "running", "badminton", "Marathi films", "biryani", "sunsets", "stand-up comedy",
]
BIO_TEMPLATES = [
    "{job} · {i1} & {i2} lover",
    "{job} based in {city_short}. Into {i1}, {i2} and {i3}.",
    "{job}. Learning something new every day ✨",
    "Talks about {i1}, {i2} and everything in between.",
    "{job} | {i1} | {i2}",
    "Building things on the internet. {i1} on weekends.",
    "{job} by day, {i1} enthusiast by night 🌙",
    "Coffee first, code later ☕ {job}.",
    "",
]

POSTS = [
    "Just deployed my new Next.js project! 🚀 The developer experience keeps getting better. #NextJS #WebDev",
    "Weekend coding + coffee = perfect combo ☕💻 #DevLife",
    "Finally finished reading 'Atomic Habits'. Small changes really add up. #Books",
    "Pune rains are back and so is my chai addiction ☔ #Pune #Monsoon",
    "Anyone else think FastAPI docs are some of the best out there? #Python #FastAPI",
    "Morning run done — 5 km in 28 minutes. Slowly getting there 🏃 #Fitness",
    "Trying to learn Rust this month. Wish me luck 🦀 #RustLang #100DaysOfCode",
    "What a match last night! That final over had me on the edge of my seat 🏏 #Cricket",
    "Hot take: tabs vs spaces doesn't matter, consistency does. #Programming",
    "Made biryani from scratch for the first time and honestly… nailed it 🍛 #Cooking",
    "Sunset at Marine Drive never gets old 🌅 #Mumbai",
    "Shipped a small feature today and it felt huge. Celebrate the small wins! #DevLife",
    "Started a new design system at work. Tokens first, components second. #Design #UX",
    "Hiking up Sinhagad this weekend. Who's in? ⛰️ #Trekking #Pune",
    "The best debugging tool is still a good night's sleep 😴 #Programming",
    "Rewatching Interstellar for the 5th time. Still gives me goosebumps. #Movies",
    "Just hit 100 days of LeetCode! Consistency > intensity. #100DaysOfCode",
    "Coffee tasting at a tiny café in Koregaon Park today. Highly recommend ☕ #Pune #Coffee",
    "If you're learning React, build projects. Tutorials only take you so far. #React #WebDev",
    "Rainy evening, lo-fi beats and a good book. Perfect Sunday 📚 #Books",
    "Our team just launched our startup's beta! Grateful for everyone who believed in us 🙏 #Startups",
    "MongoDB aggregation pipelines are so powerful once they click. #MongoDB",
    "Tried the new metro line today — super clean and fast 🚇 #Pune",
    "Badminton at 6am with friends. Best way to start the day 🏸 #Fitness",
    "Dark mode everything. Light mode is for screenshots only 🌙 #DevLife",
    "Exam season is here. Library mode activated 📖 #StudentLife",
    "Street food tour in Old Delhi was unreal. Chole bhature supremacy 🤤 #Delhi #Food",
    "Spent the day photographing the old wadas of Pune. So much history 📸 #Photography #Pune",
    "Reminder: drink water, take breaks, stretch your back 🧘",
    "AI won't replace developers, but developers who use AI well might replace those who don't. #AI",
    "Football under floodlights hits different ⚽ #Football",
    "Finished my first marathon! 42.2 km of pure determination 🏅 #Running",
    "Learning Kubernetes and my brain is a cluster right now 😅 #DevOps",
    "Diwali preparations at home — the house smells like faral already 🪔 #Diwali",
    "Accessibility isn't a feature, it's a requirement. #A11y #WebDev",
    "Goa in the off-season is so peaceful 🌴 #Goa #Travel",
    "First day at the new job! Nervous and excited at the same time 😊",
    "Pro tip: write the README before you write the code. #Programming",
    "Ganpati Bappa Morya! 🙏 #GaneshChaturthi",
    "Is it just me or does every side project start with buying a domain? 😂 #DevLife",
    "Chess club meetup tonight. Time to lose gracefully ♟️ #Chess",
    "Started journaling every night. Already feeling more focused ✍️",
    "Cloud bills are the real horror stories 👻 #DevOps #Cloud",
    "Our college fest is this weekend! Come for the music, stay for the food 🎶 #CollegeLife",
    "Tried a 24-hour digital detox. Hardest and best thing I've done this month.",
    "Nothing beats Maharashtrian misal on a cold morning 🌶️ #Food #Pune",
    "Just open-sourced my first library! Feedback welcome 🙌 #OpenSource",
    "Design tip: whitespace is not wasted space. #Design",
    "Weekend road trip to Lonavala done ✅ #Travel",
    "TypeScript caught a bug before it reached production today. Worth it. #TypeScript",
]
REPLIES = [
    "Congrats! 🎉", "This is so true 💯", "Totally agree!", "Love this 😍", "Haha same here 😂",
    "Need to try this!", "Wow, great work 👏", "Count me in!", "Bookmarking this.", "Well said.",
    "So proud of you!", "That looks amazing 🔥", "Can you share more details?", "Big mood 😅",
    "Couldn't agree more.", "Let's catch up soon!", "This made my day 😊", "Facts.", "Inspiring!", "Same energy ⚡",
]


def make_username(first, last, taken, rng):
    base = re.sub(r"[^a-z0-9]", "", f"{first}{last}".lower())[:20] or "user"
    candidates = [
        f"{first.lower()}.{re.sub(r'[^a-z]', '', last.lower())}",
        f"{first.lower()}_{re.sub(r'[^a-z]', '', last.lower())}",
        f"{base}{rng.randint(1, 99)}",
        f"{first.lower()}{rng.randint(100, 999)}",
    ]
    for c in candidates:
        c = re.sub(r"[^a-z0-9_.-]", "", c)[:30]
        if len(c) >= 3 and c not in taken:
            taken.add(c)
            return c
    while True:
        c = f"{base}{rng.randint(1000, 9999)}"[:30]
        if c not in taken:
            taken.add(c)
            return c


def _demo_password() -> str:
    """SEED_DEFAULT_USER_PASSWORD from the environment or backend/.env, else a default."""
    if os.environ.get("SEED_DEFAULT_USER_PASSWORD"):
        return os.environ["SEED_DEFAULT_USER_PASSWORD"]
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("SEED_DEFAULT_USER_PASSWORD="):
                return line.split("=", 1)[1].strip().strip('"')
    return "Connectly123"


def random_date(rng, start, end):
    return start + timedelta(seconds=rng.randint(0, max(1, int((end - start).total_seconds()))))


async def remove():
    d = db.get_db()
    ids = [u["_id"] async for u in d.users.find({"demoBatch": BATCH}, {"_id": 1})]
    if not ids:
        print("Nothing to remove.")
        return
    tweet_ids = [t["_id"] async for t in d.tweets.find({"author": {"$in": ids}}, {"_id": 1})]
    await d.tweets.delete_many({"_id": {"$in": tweet_ids}})
    await d.profiles.delete_many({"user": {"$in": ids}})
    await d.users.delete_many({"_id": {"$in": ids}})
    # Remove their traces from everyone else.
    await d.profiles.update_many(
        {}, {"$pull": {"following": {"$in": ids}, "followers": {"$in": ids}, "likes": {"$in": tweet_ids},
                       "retweets": {"$in": tweet_ids}, "bookmarks": {"$in": tweet_ids}}}
    )
    await d.tweets.update_many({}, {"$pull": {"likes": {"$in": ids}, "retweets": {"$in": ids}}})
    await d.notifications.delete_many({"$or": [{"actor": {"$in": ids}}, {"user": {"$in": ids}}, {"tweet": {"$in": tweet_ids}}]})
    async for t in d.tweets.find({"repliesCount": {"$gt": 0}}, {"_id": 1}):
        await d.tweets.update_one({"_id": t["_id"]}, {"$set": {"repliesCount": await d.tweets.count_documents({"replyTo": t["_id"]})}})
    print(f"Removed {len(ids)} generated people and {len(tweet_ids)} of their posts.")


async def generate(n_women, n_men, seed):
    d = db.get_db()
    if await d.users.count_documents({"demoBatch": BATCH}):
        print("Generated people already exist. Run with --remove first to regenerate.")
        return

    rng = random.Random(seed)
    now = datetime.now(UTC)
    password_hash = hash_password(_demo_password())
    taken = {u["username"] async for u in d.users.find({}, {"username": 1})}

    def pick_names(pool, n):
        firsts = rng.sample(pool, min(n, len(pool)))
        while len(firsts) < n:
            firsts.append(rng.choice(pool))
        return firsts

    people = [("f", f) for f in pick_names(WOMEN, n_women)] + [("m", m) for m in pick_names(MEN, n_men)]
    rng.shuffle(people)  # mixed order

    users, profiles = [], []
    for _gender, first in people:
        last = rng.choice(SURNAMES)
        username = make_username(first, last, taken, rng)
        joined = random_date(rng, now - timedelta(days=720), now - timedelta(days=7))
        city = rng.choice(CITIES)
        i1, i2, i3 = rng.sample(INTERESTS, 3)
        bio = rng.choice(BIO_TEMPLATES).format(job=rng.choice(JOBS), i1=i1, i2=i2, i3=i3, city_short=city.split(",")[0])
        uid = ObjectId()
        users.append({
            "_id": uid, "name": f"{first} {last}", "username": username,
            "email": f"{username.replace('.', '_')}@example.com", "password": password_hash,
            "role": "user", "createdAt": joined, "updatedAt": joined, "demoBatch": BATCH,
        })
        profiles.append({
            "user": uid, "bio": bio, "location": city if rng.random() < 0.85 else "",
            "website": f"https://{username.replace('.', '').replace('_', '')}.dev" if rng.random() < 0.25 else "",
            "birthday": random_date(rng, datetime(1988, 1, 1, tzinfo=UTC), datetime(2006, 12, 31, tzinfo=UTC)),
            "following": [], "followers": [], "likes": [], "retweets": [], "bookmarks": [],
            "createdAt": joined, "updatedAt": joined, "demoBatch": BATCH,
        })

    by_id = {u["_id"]: u for u in users}
    prof_by_user = {p["user"]: p for p in profiles}
    ids = [u["_id"] for u in users]

    # Follows: everyone follows 5–35 others; a few "popular" people get more followers.
    popular = set(rng.sample(ids, 12))
    for uid in ids:
        others = [x for x in ids if x != uid]
        weights = [6 if x in popular else 1 for x in others]
        targets = set()
        for _ in range(rng.randint(5, 35)):
            targets.add(rng.choices(others, weights=weights)[0])
        for t in targets:
            prof_by_user[uid]["following"].append(t)
            prof_by_user[t]["followers"].append(uid)

    # Posts: 1–8 per person, dated after they joined.
    tweets = []
    for uid in ids:
        joined = by_id[uid]["createdAt"]
        for text in rng.sample(POSTS, rng.randint(1, 8)):
            ts = random_date(rng, joined, now - timedelta(minutes=5))
            tweets.append({
                "_id": ObjectId(), "author": uid, "text": text, "image": None, "video": None, "replyTo": None,
                "hashtags": extract_hashtags(text), "mentions": [], "repliesCount": 0, "edited": False,
                "likes": [], "retweets": [], "createdAt": ts, "updatedAt": ts, "demoBatch": BATCH,
            })

    # Replies, likes and reposts, mostly from followers.
    replies = []
    for t in tweets:
        audience = prof_by_user[t["author"]]["followers"] or ids
        for liker in rng.sample(audience, min(len(audience), rng.randint(0, 25))):
            t["likes"].append(liker)
            prof_by_user[liker]["likes"].append(t["_id"])
        for rt in rng.sample(audience, min(len(audience), rng.randint(0, 5))):
            t["retweets"].append(rt)
            prof_by_user[rt]["retweets"].append(t["_id"])
        for replier in rng.sample(audience, min(len(audience), rng.choice([0, 0, 0, 1, 1, 2, 3]))):
            ts = random_date(rng, t["createdAt"], now)
            replies.append({
                "_id": ObjectId(), "author": replier, "text": rng.choice(REPLIES), "image": None, "video": None,
                "replyTo": t["_id"], "hashtags": [], "mentions": [], "repliesCount": 0, "edited": False,
                "likes": [], "retweets": [], "createdAt": ts, "updatedAt": ts, "demoBatch": BATCH,
            })
        t["repliesCount"] = sum(1 for r in replies if r["replyTo"] == t["_id"])

    await d.users.insert_many(users)
    await d.profiles.insert_many(profiles)
    await d.tweets.insert_many(tweets + replies)

    women = sum(1 for g, _ in people if g == "f")
    print(f"Added {len(users)} fictional people ({women} women, {len(users) - women} men),")
    print(f"{len(tweets)} posts, {len(replies)} replies, "
          f"{sum(len(p['following']) for p in profiles)} follows, {sum(len(t['likes']) for t in tweets)} likes.")


async def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--women", type=int, default=65)
    parser.add_argument("--men", type=int, default=95)
    parser.add_argument("--seed", type=int, default=2026, help="random seed (same seed = same people)")
    parser.add_argument("--remove", action="store_true", help="delete all generated people")
    args = parser.parse_args()

    await db.connect()
    try:
        if args.remove:
            await remove()
        else:
            await generate(args.women, args.men, args.seed)
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
