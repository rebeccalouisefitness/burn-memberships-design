import re
TIERS='''<div class="tiers" id="tiers">
  <article class="tier" aria-label="BURN">
    <div class="tn">BURN</div>
    <div class="price"><span class="amt" data-amt="burn">$7.99</span><span class="per" data-per>/ month</span><span class="save" data-save="burn" hidden>Save 12%</span></div>
    <div class="alt" data-alt="burn">or $83.99 a year</div>
    <p class="desc">Workouts, challenges, recipes and the BURN community.</p>
    <a class="btn ghost block" href="join.html?tier=burn" data-checkout data-join="tier" data-tier="burn">Join BURN</a>
    <div class="secure">Secure checkout &middot; cancel any time</div>
    <ul><li><span>Workout library<small>40+ programs by body part, style, equipment and time</small></span></li><li><span>Monthly challenges<small>A new challenge and calendar every month</small></span></li><li><span>Recipes &amp; mindset<small>Recipes for the way you eat, and the Thrive library</small></span></li><li><span>Community chat<small>Post, share and cheer each other on</small></span></li><li><span>Save your favourites<small>Heart the workouts and recipes you love so they&rsquo;re always one tap away</small></span></li><li><span>Progress photos<small>Snap your progress and see how far you&rsquo;ve come. Only you can see them</small></span></li></ul>
  </article>
  <article class="tier" aria-label="BURN+">
    <div class="tn">BURN+</div>
    <div class="price"><span class="amt" data-amt="burnplus">$17.99</span><span class="per" data-per>/ month</span><span class="save" data-save="burnplus" hidden>Save 22%</span></div>
    <div class="alt" data-alt="burnplus">or $167.99 a year</div>
    <p class="desc" data-new-copy="NEW (cycle added)">Everything in BURN, plus training that works with your cycle, live classes, and the tools to make BURN your own.</p>
    <a class="btn ghost block" href="join.html?tier=burnplus" data-checkout data-join="tier" data-tier="burnplus">Join BURN+</a>
    <div class="secure">Secure checkout &middot; cancel any time</div>
    <ul><li class="inc">Everything in BURN, plus:</li><li data-new-copy="NEW tagline"><span>Train with your cycle<small>Workouts picked for your phase, including perimenopause and menopause. How you feel always wins</small></span></li><li data-new-copy="NEW row"><span>Live classes<small>Book a class and work out live with everyone</small></span></li><li><span>Build your own workouts &amp; schedule your week<small>Your own playlists from the library</small></span></li><li><span>Daily Read &amp; gratitude journal<small data-new-copy="NEW tagline">A daily read and a moment to reflect, every day</small></span></li><li><span>Activity tracking stats<small data-new-copy="NEW tagline">Your workouts, minutes and streaks at a glance</small></span></li><li><span>Achievement badges<small>Earned as you train</small></span></li><li><span>Opt-in leaderboard<small data-new-copy="NEW tagline">See how you rank with your squad, only if you want to</small></span></li></ul>
  </article>
  <article class="tier feat" aria-label="BURN Complete">
    <div class="flag" data-new-copy="was: Most personalised">The ultimate</div>
    <div class="tn">BURN Complete</div>
    <div class="price"><span class="amt" data-amt="burncomplete">$27.99</span><span class="per" data-per>/ month</span><span class="save" data-save="burncomplete" hidden>Save 33%</span></div>
    <div class="alt" data-alt="burncomplete">or $224.99 a year</div>
    <p class="desc" data-new-copy="NEW"><strong>Your ultimate personalised membership.</strong> Everything in BURN+, plus a plan built just for you and programs for every stage of your life.</p>
    <a class="btn block" href="join.html?tier=burncomplete" data-checkout data-join="tier" data-tier="burncomplete">Join BURN Complete</a>
    <div class="secure">Secure checkout &middot; cancel any time</div>
    <ul><li class="inc">Everything in BURN+, plus:</li><li><span>My BURN plan<small>Your personalised workout plan, built around you</small></span></li><li data-new-copy="NEW row"><span>Pregnancy &amp; postpartum programs<small>Workouts by trimester and the 12-month postpartum program</small></span></li><li data-new-copy="NEW row"><span>Menopause program &amp; tracking<small>Strong Through Menopause, plus log how you feel and see your patterns</small></span></li><li><span>Ask BURN AI<small data-new-copy="NEW tagline">Your questions answered, 24/7</small></span></li><li><span>Points &amp; rewards store<small>Earn points and spend them in the store</small></span></li><li><span>Every new feature first</span></li></ul>
  </article>
</div>'''
NUT='''<div class="addon nut2" id="nutrition" data-new-copy="NEW (developed)">
  <div class="nut2-head"><div class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/></svg></div>
  <div><div class="kick">Nutrition &middot; add to any membership</div><h3>Unlock Your Nutrition Experience</h3><p>Start a nutrition plan with our products and you get <strong>free access</strong> to all of this, right inside your BURN app:</p></div></div>
  <ul class="nut2-list"><li><b>Food logging &amp; tracking</b><span>Log your meals and see your day at a glance</span></li><li><b>Personalised meal plans</b><span>Built around you and your goals</span></li><li><b>Exclusive challenges</b><span>Like Two Shakes a Day, the 21-Day Reset and Energy Boost</span></li><li><b>One-on-one coaching</b><span>A real coach in your corner</span></li><li><b>24/7 AI support</b><span>Answers whenever you need them</span></li></ul>
  <ol class="nut2-how"><li><span>1</span>Join any BURN membership</li><li><span>2</span>Start a nutrition plan with our team</li><li><span>3</span>Your nutrition tools unlock in the app, for free</li></ol>
</div>'''
def QUIZ(src): return '''<div class="quiz2 quiz3" data-new-copy="NEW (simpler)">
      <figure class="qz2-photo"><img loading="lazy" src="img/pick/IMG_5877-p.jpg" alt="Rebecca Louise smiling at her phone in her lilac workout set" width="733" height="1100"></figure>
      <div class="qz2-copy">
        <h3>Not sure which membership?</h3>
        <button type="button" class="btn" data-quiz-open="'''+src+'''">Take the 30-second quiz</button>
      </div>
    </div>'''
def apply_shared(s, quiz_src):
    s,n=re.subn(r'<div class="tiers" id="tiers">.*?</article>\s*</div>',TIERS,s,count=1,flags=re.S); assert n==1,'tiers'
    s,n=re.subn(r'<div class="addon no-btn" id="nutrition">.*?</p></div>\s*</div>',NUT,s,count=1,flags=re.S); assert n==1,'nut'
    s,n=re.subn(r'<div class="quiz2"[^>]*>.*?</div>\s*</div>',QUIZ(quiz_src),s,count=1,flags=re.S); assert n==1,'quiz'
    s=s.replace('<span class="new-badge" aria-label="New">NEW</span>','').replace(' <small>','<small>')
    return s
