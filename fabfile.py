import fabric.api as fabric

DROPBOX = "~/Dropbox/Public/Map/"

MSCS = "abrooks@morbius.mscs.mu.edu:./public_html/map/"

def pushDropbox():
    """For showing others the prototype, copy to Dropbox."""
    fabric.local("cp -r * " + DROPBOX)
    print("Should be visible at: https://dl.dropboxusercontent.com/u/20888225/Map/index.html")


def pushMSCS():
    """For showing others the prototype, copy to my web space on MSCS."""
    fabric.local("scp -r * " + MSCS)
    print("Should be visible at: http://www.mscs.mu.edu/~abrooks/map/index.html")
