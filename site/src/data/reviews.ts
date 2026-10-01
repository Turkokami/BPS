/**
 * Quoted Google reviews, word for word.
 *
 * Read from the live Google Business Profile on 1 Oct 2026 (all 100 loaded in
 * the profile's review dialog, every "More" expanded). Spelling, punctuation and
 * emoji are the customer's own and are not corrected. Google's chips ("Great
 * price", "Services …") are not part of the review text and are left out.
 *
 * `month` is derived from Google's relative time on the read date ("4 months
 * ago" on 1 Oct 2026 = June 2026). Google says only "a year ago" for anything
 * between about 12 and 23 months, so those carry the year alone. Edited reviews
 * carry the edit date, which is the one Google shows.
 *
 * Selection: reviews that name a pest and an outcome. Deliberately left out —
 *  - reviews describing free re-treatment or a guarantee, while the guarantee
 *    page stays gated pending the written agreement (BUSINESS.guarantee);
 *  - reviews quoting a price, while pricing is unconfirmed by the client;
 *  - a review whose typo reverses its meaning;
 *  - a reviewer sharing the owner's surname, and the site builder's own review.
 * Re-read the profile before adding to this list; never paraphrase.
 */
export interface Review {
  name: string;          // first name only, as the reviews page promises
  month: string;
  stars: 4 | 5;
  pests: string[];       // what the review is about, for the reader's scan
  text: string;
  reply?: string;        // the owner's public reply, only where it adds something
}

export const REVIEWS_READ_ON = '2026-10-01';

export const REVIEWS: Review[] = [
  {
    name: 'Steve', month: 'September 2026', stars: 5, pests: ['Ants'],
    text: 'Great service and pricing. Tried other methods to control ants for years with minimal success. The issue was resolved after just one visit. Amazing.',
  },
  {
    name: 'Robert', month: 'September 2026', stars: 5, pests: ['Ants'],
    text: 'Fit me in same day I called, fair prices nice guy. Fixed my ant problem. Will use services going forwards; would recommend !',
  },
  {
    name: 'Riley', month: 'July 2026', stars: 5, pests: ['Mosquitoes'],
    text: 'We hired another local well known company to come out to spray our yard for mosquitoes. Within days, the mosquitos were back and they came to respray. Again, within days they were back. I then contacted Ryan after seeing his reviews and the difference was amazing. The treatment lasted much longer than before with the other company and we now have made the switch to Ryan treating our yard monthly. He takes great care in making sure everything is well treated. He is punctual, very responsive, and affordable.',
  },
  {
    name: 'Kathleen', month: 'July 2026', stars: 5, pests: ['Ticks', 'Mosquitoes'],
    text: 'The service is prompt with great communication and not one tick or mosquito seen yet. Hooray 🎉',
  },
  {
    name: 'Lauren', month: 'July 2026', stars: 5, pests: ['General pest control'],
    text: 'Friendly service, very knowledgeable and fair pricing. Serviced our home in Oxford. Would recommend!',
  },
  {
    name: 'Gail', month: 'June 2026', stars: 5, pests: ['Carpenter ants'],
    text: 'We had an excellent experience with Ryan from Blouin Pest Control. We had a carpenter ant issue and only one day to be available for service. Ryan worked around our schedule, came when he said he would, explained all the process clearly and did a great job at a reasonable price. We will definitely recommend them at our family and friends.',
  },
  {
    name: 'Luke', month: 'June 2026', stars: 5, pests: ['Ants'],
    text: 'Ryan is hands down my go to guy for anything pest related! Shows up when promised, communicates exactly what he recommends to fix your problem, and has great results! We had a serious ant problem in our building and after Ryan coming by 1 time we haven’t seen anymore ants! I would recommend Ryan and BPS to anyone that needs pest help!',
  },
  {
    name: 'Becky', month: 'June 2026', stars: 5, pests: ['Ticks', 'Ants', 'Spiders'],
    text: 'Blouin Pest Services provided excellent service from start to finish. Ryan was very professional, friendly, and knowledgeable throughout the entire process. He treated our property for ticks, ants and spiders quickly and efficiently, and the pricing was very reasonable. We had a great experience and highly recommend Blouin Pest Services to anyone looking for reliable pest control services!',
  },
  {
    name: 'Rob', month: 'June 2026', stars: 5, pests: ['General pest control'],
    text: 'Outstanding experience with Blouin Pest Control. They were professional, responsive, and did a great job treating our property. Very knowledgeable, thorough, and easy to work with. Highly recommend to anyone looking for reliable pest control service in the Bethel area.',
  },
  {
    name: 'Scott', month: 'June 2026', stars: 5, pests: ['Mice'],
    text: 'Fast, reliable service with strong communication. We had a terrible mouse infestation at our camp and Blouin fixed it for good! Thank you.',
  },
  {
    name: 'Patrick', month: 'June 2026', stars: 5, pests: ['Ticks'],
    text: 'Ryan, was prompt with returning my call, and was able to take great care of our tick problem. Having 2 dogs that like hanging outside, knowing that the yard was sprayed, gives my wife and I great comfort and peace of mind. Thank you Ryan',
  },
  {
    name: 'Jeremie', month: 'June 2026', stars: 5, pests: ['Wasps'],
    text: 'Nice guy - took care of 3 wasp nests for me after spraying them myself didnt work. Super easy to work with and was really informative too. I signed up for his monthly service to spray around the house because it was a good deal for the season - and hes been great at communicating and showing up like clockwork. Definitely recommend.',
  },
  {
    name: 'Debbie', month: 'April 2026', stars: 5, pests: ['Mice', 'Exclusion'],
    text: 'Highly recommend this company. They showed up to look at a problem with mice in the wall. They\'re knowledgeable and professional. Showed us where the mice were getting in along the foundation and garage. They sealed all the access areas and set traps with results the next day. I\'ll call them again if I ever need help with any type of pest control.',
  },
  {
    name: 'Cheri', month: 'March 2026', stars: 5, pests: ['Mice'],
    text: 'I live in the country and had a little mouse problem. These gentleman came to my house and explained every where they were coming in and explained the whole process of how we can eliminate them. Even went on to tell me how safe this is for my dog. Very, very respectful guys! Would highly recommend to anyone needing some help!!',
  },
  {
    name: 'Gabe', month: 'March 2026', stars: 5, pests: ['Commercial'],
    text: 'Ryan and his team are outstanding to work with. We were disappointed with our previous pest control company and called Ryan out of the blue on a weekend. He responded within an hour and was able to come out in-person soon after. Within 3 weeks he had done a better job than the previous company in the last 12 months. Ryan understands working with a small business and is very responsive, helpful, and professional. We look forward to working with him and his team for a long time.',
  },
  {
    name: 'Kaileigh', month: 'December 2025', stars: 5, pests: ['Apartment pests'],
    text: 'Ryan seems very knowledgeable and what a difference his company made! We had been fighting apartment pests for a long time and within a couple visits, Ryan and his company had made major progress in fighting them-and killing them! He is helpful with good information and has an effective plan. He again is battling a different household pest in my home and has just about won that war! I am so grateful my landlord called his company! Would definitely recommend them!',
  },
  {
    name: 'Sue', month: 'November 2025', stars: 5, pests: ['Bed bugs'],
    text: 'We had a bedbug situation in Portland and needed someone quick! Blouin Pest Services were incredible. They came quickly, were very friendly and knowledgeable and handled everything professionally. I would highly recommend them for any service required to remove unwanted house guests:)',
  },
  {
    name: 'Korie', month: '2025', stars: 5, pests: ['Yellow jackets'],
    text: 'Very impressed with this service. I had a terrible yellow jacket nest in my ceiling and the same day I called, Ryan showed up to take care of it for me. He even treated the perimeter of the house to be sure the entry points were taken care of. Professional, reasonable, and easy going. I would highly recommend Blouin Pest Services!',
  },
  {
    name: 'Diane', month: '2025', stars: 5, pests: ['Bees'],
    text: 'Ryan was great at locating the bee’s nest. It was in a very difficult place to reach under our deck. He came up with a solution and took care of the problem efficiently. We will recommend him to all we know.',
  },
  {
    name: 'Steven', month: '2025', stars: 5, pests: ['Fruit flies', 'Ants'],
    text: 'Ryan from Bloins pest service was awesome after several pest control services were called many did not offer the service of fruit flys to be exterminated and others were not available to do when needed !Ryan showed up when needed !Got the job done !! After he sprayed 2 day later not a fly to be seen !Fair price and awesome service in fact I am now on his yearly program for ants !🐜 Thank you Ryan !!!',
  },
  {
    name: 'Nik', month: '2025', stars: 5, pests: ['Ants', 'Mice'],
    text: 'Soo... We purchased a new home and found out it was infested with ants and mice. We bought pest control supplies and bathed everything in RAID. Come to find out, we were going about it all wrong! Luckily, I was able to get ahold of these fellas! Blouin Pest Services was very knowledgeable and prompt with their service call. I received a call back within an hour of calling and they were able to fit me in for an appointment the next day! Its a local, family run business with excellent, professional service - and all for a decent price. I highly recommend!',
  },
  {
    name: 'Shirley', month: '2025', stars: 4, pests: ['General pest control'],
    text: 'They communicate VERY well. The only thing I would ask differently is, a pamphlet on the product used. This way customers can look up to reassure themselves this product is not harmful to our plants and animals. This is our first year and first months use So far excellent results. No complaints',
    reply: 'Hey Shirley! Thank you for your review. I do like that idea to be more informative. I am very up front about any chemical usage and can give you any information as for the specific products being used. I always be sure to apply pesticides safely for any animals or plants in the area.',
  },
];
