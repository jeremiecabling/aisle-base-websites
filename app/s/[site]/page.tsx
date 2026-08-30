import { notFound } from "next/navigation"
import { Countdown } from "@/components/sections/countdown"
import { daysUntilInTimezone } from "@/lib/countdown"
import { Faq } from "@/components/sections/faq"
import { Footer } from "@/components/sections/footer"
import { GallerySection } from "@/components/sections/gallery"
import { Hero } from "@/components/sections/hero"
import { Nav, type NavItem } from "@/components/sections/nav"
import { Registry } from "@/components/sections/registry"
import { Schedule } from "@/components/sections/schedule"
import { Story } from "@/components/sections/story"
import { ThingsToDo } from "@/components/sections/things-to-do"
import { Travel } from "@/components/sections/travel"
import { chrome } from "@/lib/chrome"
import { getTenantConfig } from "@/lib/config"

/**
 * The ONE-PAGE tenant site (HANDOFF §7.1): Nav → Hero → Countdown → [RSVP,
 * next session] → Schedule → Travel → Things To Do → FAQ → Registry → Story
 * → Gallery → Footer. Sections render iff present in config; nav lists only
 * the sections that render. All labels resolve through chrome strings (Q17).
 */
export default async function TenantPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  const config = await getTenantConfig(site)
  if (!config) notFound()

  const { content, entitlements } = config
  const { basics } = content

  const showSchedule = content.schedule.length > 0
  const showTravel = content.travel.length > 0
  const showThingsToDo = entitlements.things_to_do && (content.things_to_do?.length ?? 0) > 0
  const showFaq = content.faq.length > 0
  const showRegistry = content.registry.length > 0
  const showStory = content.story.length > 0
  const showGallery = (content.gallery?.images.length ?? 0) > 0

  const navItems: NavItem[] = [
    showSchedule && { id: "schedule", label: chrome(content, "nav_schedule") },
    showTravel && { id: "travel", label: chrome(content, "nav_travel") },
    showThingsToDo && { id: "things-to-do", label: chrome(content, "nav_things_to_do") },
    showFaq && { id: "faqs", label: chrome(content, "nav_faq") },
    showRegistry && { id: "registry", label: chrome(content, "nav_registry") },
    showStory && { id: "our-story", label: chrome(content, "nav_story") },
    showGallery && { id: "gallery", label: chrome(content, "nav_gallery") },
  ].filter((item): item is NavItem => item !== false)

  return (
    <div className="min-h-screen bg-canvas">
      <Nav
        monogram={basics.monogram ?? basics.couple_names}
        items={navItems}
        openLabel={chrome(content, "nav_menu_open")}
        closeLabel={chrome(content, "nav_menu_close")}
      />
      <Hero basics={basics} />
      <Countdown
        weddingDate={basics.wedding_date}
        timezone={basics.timezone}
        initialDays={daysUntilInTimezone(basics.wedding_date, basics.timezone)}
        caption={basics.countdown_caption ?? chrome(content, "countdown_days")}
        todayMessage={chrome(content, "countdown_today")}
      />
      {showSchedule ? (
        <Schedule heading={chrome(content, "schedule_heading")} days={content.schedule} />
      ) : null}
      {showTravel ? (
        <Travel
          heading={chrome(content, "travel_heading")}
          bookButtonLabel={chrome(content, "travel_book_button")}
          items={content.travel}
        />
      ) : null}
      {showThingsToDo && content.things_to_do ? (
        <ThingsToDo heading={chrome(content, "things_to_do_heading")} items={content.things_to_do} />
      ) : null}
      {showFaq ? <Faq heading={chrome(content, "faq_heading")} items={content.faq} /> : null}
      {showRegistry ? (
        <Registry
          heading={chrome(content, "registry_heading")}
          intro={basics.registry_intro}
          items={content.registry}
        />
      ) : null}
      {showStory ? <Story heading={chrome(content, "story_heading")} blocks={content.story} /> : null}
      {showGallery && content.gallery ? (
        <GallerySection heading={chrome(content, "gallery_heading")} gallery={content.gallery} />
      ) : null}
      <Footer
        coupleNames={basics.couple_names}
        dateDisplay={basics.wedding_date_display}
        note={basics.footer_note}
      />
    </div>
  )
}
