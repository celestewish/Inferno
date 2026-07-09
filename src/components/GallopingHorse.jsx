let gallopUid = 0

// Dante galloping in a friendly side profile: the closing brand motif on the
// landing page. Ember mane and tail, soft glowing coat, embers trailing behind.
export default function GallopingHorse({ size = 280 }) {
  const uid = (gallopUid += 1)
  const id = (name) => `gallop-${uid}-${name}`

  return (
    <svg
      className="galloping-horse"
      width={size}
      height={size / 2}
      viewBox="0 0 1440 720"
      role="img"
      aria-labelledby={`${id('title')} ${id('desc')}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={id('title')}>Dante galloping across the Inferno landing page</title>
      <desc id={id('desc')}>
        A friendly flame horse mascot galloping in side profile with ember mane and soft violet shadows.
      </desc>
      <defs>
        <radialGradient id={id('bgGlow')} cx="50%" cy="54%" r="60%">
          <stop offset="0%" stopColor="#6f4bff" stopOpacity=".28" />
          <stop offset="45%" stopColor="#24194a" stopOpacity=".2" />
          <stop offset="100%" stopColor="#080b16" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('coat')} x1="22%" y1="16%" x2="76%" y2="86%">
          <stop offset="0%" stopColor="#fff9ee" />
          <stop offset="42%" stopColor="#f3f0ff" />
          <stop offset="100%" stopColor="#b9c2ff" />
        </linearGradient>
        <linearGradient id={id('shadowCoat')} x1="18%" y1="20%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#b6c7ff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#6b4fd4" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={id('flame')} x1="0%" y1="10%" x2="100%" y2="90%">
          <stop offset="0%" stopColor="#fff3a1" />
          <stop offset="36%" stopColor="#ff9a3d" />
          <stop offset="72%" stopColor="#ff4f6d" />
          <stop offset="100%" stopColor="#9a5cff" />
        </linearGradient>
        <linearGradient id={id('cyanRim')} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7df9ff" stopOpacity=".9" />
          <stop offset="100%" stopColor="#7df9ff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('softGlow')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 1 0 .55 0 0 .43 0 0 .2 0 .1 0 0 0 .7 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id('tinyGlow')} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1440" height="720" fill="#080b16" />
      <rect width="1440" height="720" fill={`url(#${id('bgGlow')})`} />
      <path d="M0 560 C220 528 316 618 515 584 C715 550 864 490 1080 538 C1242 575 1329 544 1440 510 L1440 720 L0 720 Z" fill="#12182b" />
      <path d="M76 592 C228 552 375 642 548 605 C777 556 890 508 1088 552 C1249 588 1341 557 1440 528" fill="none" stroke="#35245f" strokeWidth="2" />
      <ellipse cx="723" cy="592" rx="356" ry="42" fill="#02030a" opacity=".45" />

      <g filter={`url(#${id('softGlow')})`}>
        {/* ember trail */}
        <g opacity=".9">
          <circle cx="262" cy="471" r="5" fill="#ffb24a" filter={`url(#${id('tinyGlow')})`} />
          <circle cx="221" cy="514" r="3.5" fill="#ff6b4a" filter={`url(#${id('tinyGlow')})`} />
          <circle cx="326" cy="537" r="4" fill="#ffd36a" filter={`url(#${id('tinyGlow')})`} />
          <circle cx="284" cy="587" r="2.5" fill="#9f7aff" filter={`url(#${id('tinyGlow')})`} />
          <path d="M116 526 C178 498 236 504 310 535" fill="none" stroke={`url(#${id('flame')})`} strokeWidth="5" strokeLinecap="round" opacity=".42" />
        </g>

        {/* tail flames */}
        <path d="M420 399 C331 331 242 352 167 294 C210 391 309 433 394 437 C302 447 234 489 184 566 C275 527 357 512 437 468 C397 523 423 569 476 613 C464 548 496 498 551 459 C514 446 471 427 420 399 Z" fill={`url(#${id('flame')})`} opacity=".92" />
        <path d="M435 421 C360 381 304 382 244 350 C291 418 363 448 445 455 C374 469 324 501 279 548 C351 524 430 502 492 462 C469 504 482 539 518 575 C514 516 540 484 585 455 C531 450 481 443 435 421 Z" fill="#ffd86d" opacity=".55" />

        {/* body */}
        <path d="M486 400 C512 326 594 284 696 300 C772 312 831 352 877 417 C912 466 885 521 823 535 C751 552 654 546 569 525 C501 508 459 467 486 400 Z" fill={`url(#${id('coat')})`} />
        <path d="M516 478 C590 532 733 553 836 520 C793 565 654 578 552 542 C507 526 485 505 473 479 C486 484 499 485 516 478 Z" fill={`url(#${id('shadowCoat')})`} opacity=".42" />
        <path d="M517 405 C558 350 641 326 744 341" fill="none" stroke={`url(#${id('cyanRim')})`} strokeWidth="6" strokeLinecap="round" opacity=".7" />

        {/* neck and head */}
        <path d="M821 331 C867 260 930 219 1018 223 C1076 226 1117 257 1123 298 C1129 341 1093 371 1036 373 C988 376 948 390 910 427 C874 394 849 363 821 331 Z" fill={`url(#${id('coat')})`} />
        <path d="M977 240 C1002 199 1020 176 1048 161 C1042 205 1054 223 1082 244 C1041 246 1012 249 977 240 Z" fill={`url(#${id('coat')})`} />
        <path d="M889 277 C849 230 789 222 735 240 C790 258 817 292 838 340 C860 320 875 297 889 277 Z" fill={`url(#${id('flame')})`} />
        <path d="M890 272 C948 238 1001 244 1058 275 C1020 226 948 203 879 224 C852 233 827 254 809 281 C839 287 865 284 890 272 Z" fill={`url(#${id('flame')})`} opacity=".92" />
        <circle cx="1063" cy="290" r="14" fill="#1a1028" />
        <circle cx="1068" cy="285" r="5" fill="#fff4c4" />
        <path d="M1107 323 C1094 337 1077 342 1058 338" fill="none" stroke="#2c2448" strokeWidth="5" strokeLinecap="round" />
        <path d="M936 372 C972 383 1017 382 1058 372" fill="none" stroke="#7df9ff" strokeWidth="5" strokeLinecap="round" opacity=".55" />

        {/* legs in gallop pose */}
        <path d="M585 511 C548 555 516 602 461 643" fill="none" stroke={`url(#${id('coat')})`} strokeWidth="34" strokeLinecap="round" />
        <path d="M461 643 C430 655 401 653 374 641" fill="none" stroke="#33254a" strokeWidth="16" strokeLinecap="round" />
        <path d="M678 532 C690 594 723 625 782 641" fill="none" stroke={`url(#${id('coat')})`} strokeWidth="34" strokeLinecap="round" />
        <path d="M782 641 C808 642 833 634 852 616" fill="none" stroke="#33254a" strokeWidth="16" strokeLinecap="round" />
        <path d="M804 511 C864 542 907 581 948 636" fill="none" stroke={`url(#${id('coat')})`} strokeWidth="31" strokeLinecap="round" />
        <path d="M948 636 C971 643 998 641 1021 628" fill="none" stroke="#33254a" strokeWidth="15" strokeLinecap="round" />
        <path d="M636 519 C604 475 556 447 489 428" fill="none" stroke={`url(#${id('coat')})`} strokeWidth="30" strokeLinecap="round" />
        <path d="M489 428 C454 430 429 444 407 468" fill="none" stroke="#33254a" strokeWidth="14" strokeLinecap="round" />

        {/* soft body line art */}
        <path d="M494 422 C552 366 646 345 743 357 C806 366 846 394 872 436" fill="none" stroke="#6e5ad8" strokeOpacity=".32" strokeWidth="5" strokeLinecap="round" />
        <path d="M605 337 C649 369 694 381 749 373" fill="none" stroke="#f8d7ff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g opacity=".75">
        <path d="M1120 508 l10 25 25 9 -25 9 -10 25 -9 -25 -25 -9 25 -9z" fill="#ffb14a" filter={`url(#${id('tinyGlow')})`} />
        <path d="M1225 404 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6z" fill="#8cf7ff" filter={`url(#${id('tinyGlow')})`} />
        <path d="M356 338 l7 18 18 7 -18 7 -7 18 -7 -18 -18 -7 18 -7z" fill="#a987ff" filter={`url(#${id('tinyGlow')})`} />
      </g>
    </svg>
  )
}
