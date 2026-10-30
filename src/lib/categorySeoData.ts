// src/lib/categorySeoData.ts

export interface CategoryFaq {
  question: string;
  answer: string;
}

export interface CategorySeoContent {
  h2Title: string;
  descriptionHtml: string;
  faqs: CategoryFaq[];
}

export const categorySeoData: Record<string, CategorySeoContent> = {
  "male-actor": {
    h2Title: "Male Actor Auditions, Casting Calls & Acting Jobs in India",
    descriptionHtml: "Looking for the latest male actor auditions, film casting calls, or acting roles? Newtalent is India's No. 1 platform for actors to connect with directors and casting agencies. Build your acting portfolio, showcase your showreels, and find daily movie casting opportunities in Bangalore and across India.",
    faqs: [
      {
        question: "How can I find acting auditions for male actors on Newtalent?",
        answer: "Register as an artist, create your professional acting portfolio with your photos, age, bio, and showreels. Once your profile is verified, you can search and receive direct casting requests from film directors and casting agencies."
      },
      {
        question: "Are there casting calls for new or fresher male actors?",
        answer: "Yes! Filmmakers on Newtalent search for both experienced actors and fresh faces for movies, web series, short films, TV serials, and TV commercials."
      },
      {
        question: "How do I hire a professional male actor on Newtalent?",
        answer: "Producers and directors can browse verified male actor profiles, filter by age, height, location, and directly send connection requests to discuss scripts and auditions."
      }
    ]
  },
  "female-actor": {
    h2Title: "Female Actor Auditions, Movie Casting Calls & Acting Roles",
    descriptionHtml: "Discover top female actor auditions, cinema casting calls, and daily acting jobs in India. Newtalent connects talented female actors and models directly with verified directors, casting directors, and production houses. Create your casting profile, upload your portfolio, and apply for film roles.",
    faqs: [
      {
        question: "How do I apply for female actor casting calls on Newtalent?",
        answer: "Sign up, build a complete portfolio with professional headshots and video showreels, and complete your KYC verification. Casting directors search the directory and contact actors directly."
      },
      {
        question: "What types of roles are available for female actors?",
        answer: "Opportunities range from lead roles in feature films and web series to roles in short films, TV serials, commercials, and modeling campaigns."
      },
      {
        question: "How do casting directors verify female actors on Newtalent?",
        answer: "Newtalent performs document verification (KYC) for every profile, ensuring that only authentic and serious actors are listed, which protects both talent and recruiters."
      }
    ]
  },
  "child-actor": {
    h2Title: "Child Actor Auditions, Movie Casting Calls & Kid Acting Roles",
    descriptionHtml: "Find the latest child actor auditions and casting calls for kids in movies, serials, and TV commercials. Newtalent provides a safe and verified environment for parents to showcase their child's acting talents and connect with top directors and casting agencies in India.",
    faqs: [
      {
        question: "How do parents register child actors on Newtalent?",
        answer: "Parents can register an account, set up the profile under the Child Actor category, add details like age, hobbies, and talent videos, and manage communication on behalf of their child."
      },
      {
        question: "Is it safe for kids to participate in casting on Newtalent?",
        answer: "Yes. We verify all production houses and directors using strict KYC guidelines, and all communication is managed securely through parental consent."
      }
    ]
  },
  "model": {
    h2Title: "Modeling Casting Calls, Fashion Auditions & Model Portfolios",
    descriptionHtml: "Are you looking for modeling casting calls, fashion auditions, or ramp show opportunities? Newtalent connects aspiring and professional models directly with fashion designers, ad agencies, photographers, and casting directors in Bangalore and across India.",
    faqs: [
      {
        question: "How do I find modeling casting calls on Newtalent?",
        answer: "Create a model profile, upload your professional model portfolio (front, profile, and full shots), add measurements, and receive direct casting invitations."
      },
      {
        question: "What modeling opportunities are available on the platform?",
        answer: "You can find opportunities for print advertisements, TV commercials (TVC), brand endorsements, fashion runway shows, and social media campaigns."
      }
    ]
  },
  "director": {
    h2Title: "Film Director Portfolios, Movie Auditions & Creative Heads",
    descriptionHtml: "Explore professional film director portfolios and creative heads on Newtalent. Our platform connects movie directors, scriptwriters, and showrunners with production companies, producers, and acting talent to initiate film auditions, casting calls, and creative media projects in India.",
    faqs: [
      {
        question: "How can film directors use Newtalent for casting?",
        answer: "Directors can register on Newtalent, browse the verified directory of actors, models, and crew, and send direct requests to cast them in their upcoming film projects."
      },
      {
        question: "How can directors showcase their film portfolios?",
        answer: "Directors can upload trailers, movie links, concept notes, and showreels to their profiles to show their creative vision to producers."
      }
    ]
  },
  "assistant-director": {
    h2Title: "Assistant Director Jobs, Film Crew Calls & Direction Positions",
    descriptionHtml: "Are you searching for assistant director jobs or direction crew opportunities? Newtalent is the leading casting and crew hiring platform in India. Connect with filmmakers, directors, and production houses looking for talented ADs, script coordinators, and film crew in Bangalore and Mumbai.",
    faqs: [
      {
        question: "How do I find Assistant Director (AD) jobs on Newtalent?",
        answer: "Create an artist profile under the Assistant Director category. Detail your previous work experience, project portfolio, and skills to receive direct inquiries from film directors and producers."
      },
      {
        question: "What skills are filmmakers looking for in an Assistant Director?",
        answer: "Filmmakers look for skills in scheduling, script breakdown, production management, continuity coordination, and on-set team management."
      },
      {
        question: "How do I hire an Assistant Director for my movie on Newtalent?",
        answer: "Navigate to the Assistant Director category, browse verified AD profiles, filter by experience level and location, and send connection requests directly to hire them."
      }
    ]
  },
  "script-writer": {
    h2Title: "Script Writer Jobs, Screenplay Portfolios & Dialogue Writers",
    descriptionHtml: "Connect with professional scriptwriters, screenplay writers, and dialogue writers in India. Showcase your scripts, story concepts, and loglines securely to verified film directors and producers looking for original stories.",
    faqs: [
      {
        question: "Is it safe to share scripts on Newtalent?",
        answer: "Yes. You can upload pitch decks or loglines, and only connect with verified directors. We advise registering scripts with writers' associations before sharing detailed playbooks."
      },
      {
        question: "How do I hire a scriptwriter on Newtalent?",
        answer: "Search scriptwriters, review their writing genres (thriller, drama, comedy), look at past projects, and send a request to collaborate on screenplays."
      }
    ]
  },
  "dancer": {
    h2Title: "Dancer Auditions, Choreographer Casting & Dance Jobs",
    descriptionHtml: "Find dancer auditions, movie song casting calls, and choreographer job opportunities. Newtalent lists top classical, contemporary, western, and cinematic dancers available for movies, music videos, stage shows, and events.",
    faqs: [
      {
        question: "How do dancers find movie auditions on Newtalent?",
        answer: "Upload dance performance videos, list your styles (hip-hop, kathak, bollywood), and complete your profile to get discovered by choreographers and film directors."
      }
    ]
  },
  "music-talent": {
    h2Title: "Music Talent, Composers & Music Directors in India",
    descriptionHtml: "Discover talented music directors, song composers, instrumentalists, and music producers on Newtalent. Connect directly with filmmakers looking to create custom soundtracks, background scores, and theme music.",
    faqs: [
      {
        question: "How do I showcase music tracks on my profile?",
        answer: "You can link YouTube, SoundCloud, or Spotify tracks on your portfolio so directors can listen to your compositions directly."
      }
    ]
  },
  "cinematographer": {
    h2Title: "Cinematographers, DOPs & Camera Crew Casting in India",
    descriptionHtml: "Hire top-rated cinematographers, Directors of Photography (DOP), and camera crew for your film, music video, or commercial project. Explore professional cinematography showreels, camera gear lists, and project portfolios on India's No. 1 casting and crew network.",
    faqs: [
      {
        question: "How can I find cinematographer jobs on Newtalent?",
        answer: "Register as a cinematographer, complete your profile, list your camera gear (like RED, ARRI, Sony), link your showreels, and connect with directors seeking visual storytellers."
      },
      {
        question: "What does a Director of Photography (DOP) do?",
        answer: "A DOP is responsible for the visual styling, lighting, camera angles, and overall camera work of a film, working closely with the director."
      }
    ]
  },
  "video-editor": {
    h2Title: "Video Editors, Colorists & Post-Production Crew Jobs",
    descriptionHtml: "Find professional video editors, colorists, and post-production specialists for feature films, web series, trailers, and YouTube commercials. Browse verified video editor portfolios, software expertise, and showreels on Newtalent.",
    faqs: [
      {
        question: "How do I hire a professional video editor?",
        answer: "Select the Video Editor category, review the editor's past editing projects and software proficiency (Premiere Pro, DaVinci Resolve, FCP), and send them a connection request."
      },
      {
        question: "Can video editors find freelance movie jobs on Newtalent?",
        answer: "Yes! Directors and creators post post-production opportunities and hire editors directly for projects of all sizes."
      }
    ]
  },
  "singer": {
    h2Title: "Singer Auditions, Playback Singers & Vocalist Jobs",
    descriptionHtml: "Discover playback singers, classical vocalists, and music talent on India's top casting platform. Browse audio samples, video performances, and vocal ranges, and hire professional singers for your film songs or albums.",
    faqs: [
      {
        question: "How can singers apply for movie auditions on Newtalent?",
        answer: "Singers can create a profile, upload audio clips showing their vocal range and versatility in different languages, and connect directly with music directors."
      }
    ]
  },
  "makeup-artist": {
    h2Title: "Makeup Artists, Prosthetic & Hair Stylist Film Jobs",
    descriptionHtml: "Hire professional bridal, cinematic, and prosthetic makeup artists in Bangalore and across India. Explore stunning portfolio galleries, prosthetic showreels, and hair styling work for movies, ads, and photo shoots.",
    faqs: [
      {
        question: "How do I hire a makeup artist for my film project?",
        answer: "Browse the Makeup Artist category, inspect their portfolio pictures of past projects (natural, glamorous, or prosthetic), and send a request."
      }
    ]
  },
  "voice-over-artist": {
    h2Title: "Voice Over Artists, Dubbing Talents & Voice Actors",
    descriptionHtml: "Find voice-over artists, dubbing talents, and voice actors for audiobooks, movie dubbing, animations, and TV advertisements. Listen to language samples, accents, and vocal pitches, and hire the perfect voice online.",
    faqs: [
      {
        question: "How do voice actors showcase demo reels on Newtalent?",
        answer: "Voice artists can upload audio demos for different accents, voice ages, and genres (documentary, high-energy ad, character voice) directly on their profiles."
      }
    ]
  }
};

export const getCategorySeoContent = (slug: string, defaultCategoryName: string): CategorySeoContent => {
  const normalizedSlug = slug.toLowerCase().trim();
  const defaultContent: CategorySeoContent = {
    h2Title: `The #1 Professional ${defaultCategoryName} Network in India`,
    descriptionHtml: `Welcome to Newtalent, the premier professional network for the film and media industry. Our platform is dedicated to connecting top-tier ${defaultCategoryName.toLowerCase()} with directors, producers, and fellow artists. Explore verified portfolios, showreels, and casting calls near you.`,
    faqs: [
      {
        question: `How do I find professional ${defaultCategoryName.toLowerCase()} on Newtalent?`,
        answer: `Browse our verified directory of ${defaultCategoryName.toLowerCase()}, filter by experience, age, and location, and send direct connection requests to discuss your project.`
      },
      {
        question: `How do I get audited for ${defaultCategoryName.toLowerCase()} roles?`,
        answer: `Create a comprehensive portfolio, get verified through our KYC process, and receive casting calls and audition requests directly from directors and agencies.`
      }
    ]
  };

  return categorySeoData[normalizedSlug] || defaultContent;
};
